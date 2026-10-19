import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AI_WORKFLOW_BATCH_LEASE_MS,
  createAiWorkflowLeaseToken,
  getAiWorkflowShanghaiDate,
  hashAiWorkflowLeaseToken,
  isAiWorkflowScheduleDue,
  selectNextAiWorkflowTopic,
} from "@/lib/ai-workflows/worker";
import {
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pollSchema = z.object({
  workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
}).strict();

function idle(reason: string) {
  return workerJsonResponse({ ok: true, state: "idle", reason });
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function POST(request: Request) {
  const workerToken = process.env.AI_WORKFLOW_WORKER_TOKEN?.trim();
  if (!workerToken) return workerJsonResponse({ ok: false, code: "WORKER_NOT_CONFIGURED" }, 503);
  if (!verifyWorkerAuthorization(request.headers.get("authorization"), {
    AUDIT_WORKER_TOKEN_CURRENT: workerToken,
  })) return workerUnauthorizedResponse();

  let input: z.infer<typeof pollSchema>;
  try {
    input = pollSchema.parse(await readBoundedJsonBody(request, 4 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const now = new Date();
  await prisma.aiWorkflowCollectionSetting.upsert({
    where: { id: "default" },
    update: { lastWorkerSeenAt: now },
    create: { id: "default", lastWorkerSeenAt: now },
  });
  try {
    const outcome = await prisma.$transaction(async (tx) => {
    // Serialize the final gate with topic/schedule edits so an old poll cannot
    // create or claim work after an administrator closes collection.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM ai_workflow_collection_settings WHERE id = 'default' FOR UPDATE`);
    const setting = await tx.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" } });
    if (setting?.isPaused) return { kind: "idle" as const, reason: "paused" };
    if (!setting?.topicListConfirmedAt) return { kind: "idle" as const, reason: "topic_list_unconfirmed" };

    const topics = await tx.aiWorkflowTopic.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, englishName: true },
    });
    if (!topics.length) return { kind: "idle" as const, reason: "topic_list_missing" };
    const activeTopicIds = topics.map((topic) => topic.id);
    const dateKey = getAiWorkflowShanghaiDate(now);
    const batchDate = new Date(dateKey + "T00:00:00.000Z");
    const dailyQuotaBatch = await tx.aiWorkflowBatch.findFirst({
      where: { lastRunDate: batchDate },
      select: { id: true },
    });
    const claimableStatuses = {
      OR: [
        { status: "queued" as const },
        { status: "paused" as const },
        {
          status: "running" as const,
          OR: [
            { leaseExpiresAt: null },
            { leaseExpiresAt: { lte: now } },
          ],
        },
      ],
    };
    const eligibleTopics = {
      topicOrderVersion: setting.topicListVersion,
      topicId: { in: activeTopicIds },
      ...(!setting.isEnabled ? { triggerType: "manual" } : {}),
    };
    const availableBatch = await tx.aiWorkflowBatch.findFirst({
      where: {
        ...(dailyQuotaBatch ? { id: dailyQuotaBatch.id } : {}),
        ...eligibleTopics,
        ...claimableStatuses,
      },
      orderBy: [{ batchDate: "asc" }, { createdAt: "asc" }],
      select: { id: true, status: true, startedAt: true },
    });
    if (dailyQuotaBatch && !availableBatch) return { kind: "idle" as const, reason: "daily_batch_quota_used" };

    let batch = availableBatch;
    if (!batch) {
      if (!setting.isEnabled) return { kind: "idle" as const, reason: "collection_disabled" };
      const runningBatch = await tx.aiWorkflowBatch.findFirst({
        where: { status: "running", leaseExpiresAt: { gt: now } },
        select: { id: true },
      });
      if (runningBatch) return { kind: "idle" as const, reason: "batch_in_progress" };
      if (!isAiWorkflowScheduleDue(setting.scheduleTime, now)) return { kind: "idle" as const, reason: "not_due" };

      const existingToday = await tx.aiWorkflowBatch.findUnique({ where: { batchDate }, select: { id: true } });
      if (existingToday) return { kind: "idle" as const, reason: "daily_batch_already_exists" };
      const previousBatchCount = await tx.aiWorkflowBatch.count({ where: { batchDate: { lt: batchDate }, topicOrderVersion: setting.topicListVersion } });
      const topic = selectNextAiWorkflowTopic(topics, previousBatchCount);
      if (!topic) return { kind: "idle" as const, reason: "topic_list_missing" };

      batch = await tx.aiWorkflowBatch.create({
        data: {
          batchDate,
          topicId: topic.id,
          topicNameSnapshot: topic.name,
          topicOrderVersion: setting.topicListVersion,
          triggerType: "scheduled",
          status: "queued",
        },
        select: { id: true, status: true, startedAt: true },
      });
    }

    const leaseToken = createAiWorkflowLeaseToken();
    const leaseExpiresAt = new Date(now.getTime() + AI_WORKFLOW_BATCH_LEASE_MS);
    const eligibleLease =
      batch.status === "queued"
        ? { id: batch.id, status: "queued" as const }
        : batch.status === "paused"
          ? { id: batch.id, status: "paused" as const }
          : {
            id: batch.id,
            status: "running" as const,
            OR: [
              { leaseExpiresAt: null },
              { leaseExpiresAt: { lte: now } },
            ],
          };
    const claimed = await tx.aiWorkflowBatch.updateMany({
      where: { ...eligibleLease, ...eligibleTopics },
      data: {
        status: "running",
        leaseOwnerId: input.workerId,
        leaseTokenHash: hashAiWorkflowLeaseToken(leaseToken),
        leaseExpiresAt,
        lastHeartbeatAt: now,
        lastWorkerStage: "claimed",
        attemptCount: { increment: 1 },
        lastRunDate: batchDate,
        startedAt: batch.startedAt ?? now,
        failureReason: null,
      },
    });
    if (claimed.count !== 1) return { kind: "idle" as const, reason: "claim_race_lost" };

    const claimedBatch = await tx.aiWorkflowBatch.findUnique({
      where: { id: batch.id },
      select: {
        id: true,
        batchDate: true,
        topicNameSnapshot: true,
        topicOrderVersion: true,
        attemptCount: true,
        checkpoint: true,
        candidates: {
          select: { id: true, repositoryId: true, repositoryUrl: true, commitSha: true, status: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!claimedBatch) return { kind: "idle" as const, reason: "claim_state_unavailable" };
    return { kind: "claimed" as const, leaseToken, leaseExpiresAt, batch: claimedBatch };
    });
    if (outcome.kind === "idle") return idle(outcome.reason);
    return workerJsonResponse({
      ok: true,
      state: "claimed",
      leaseToken: outcome.leaseToken,
      leaseExpiresAt: outcome.leaseExpiresAt.toISOString(),
      batch: outcome.batch,
    });
  } catch (error) {
    // A manual queue request can win the unique-date race after the transaction
    // checks for today's batch. Catch outside the transaction so PostgreSQL can
    // roll it back cleanly before we return an idle response.
    if (isUniqueConflict(error)) return idle("daily_batch_already_exists");
    throw error;
  }
}
