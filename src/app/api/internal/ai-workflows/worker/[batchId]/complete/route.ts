import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AI_WORKFLOW_RETRYABLE_BATCH_FAILURE_CODES,
  verifyAiWorkflowLeaseToken,
} from "@/lib/ai-workflows/worker";
import {
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const batchIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const failureCodes = [
  "INSUFFICIENT_CANDIDATES",
  "GITHUB_RATE_LIMIT",
  "NETWORK_UNAVAILABLE",
  "BUDGET_EXCEEDED",
  "SANDBOX_UNAVAILABLE",
  "ARCHIVE_UPLOAD_FAILED",
  "LOCAL_CONFIGURATION_MISSING",
  "UNKNOWN",
] as const;
const completionSchema = z.object({
  workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
  leaseToken: z.string().min(24).max(512).regex(/^\S+$/),
  state: z.enum(["completed", "partial", "failed", "paused"]),
  failureCode: z.enum(failureCodes).optional(),
  retryAfterSeconds: z.number().int().min(1).max(86_400).optional(),
}).strict().superRefine((value, context) => {
  if (value.state === "completed" && value.failureCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["failureCode"], message: "Completed batches cannot include a failure code." });
  }
  if (value.state !== "completed" && !value.failureCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["failureCode"], message: "Partial and failed batches require a stable failure code." });
  }
  if (value.state === "paused" && (!AI_WORKFLOW_RETRYABLE_BATCH_FAILURE_CODES.includes(value.failureCode as typeof AI_WORKFLOW_RETRYABLE_BATCH_FAILURE_CODES[number]) || !value.retryAfterSeconds)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["retryAfterSeconds"], message: "A transient pause requires a bounded retry delay." });
  }
  if (value.state !== "paused" && value.retryAfterSeconds !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["retryAfterSeconds"], message: "Only paused batches can include a retry delay." });
  }
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const workerToken = process.env.AI_WORKFLOW_WORKER_TOKEN?.trim();
  if (!workerToken) return workerJsonResponse({ ok: false, code: "WORKER_NOT_CONFIGURED" }, 503);
  if (!verifyWorkerAuthorization(request.headers.get("authorization"), {
    AUDIT_WORKER_TOKEN_CURRENT: workerToken,
  })) return workerUnauthorizedResponse();

  let batchId: string;
  let input: z.infer<typeof completionSchema>;
  try {
    batchId = batchIdSchema.parse((await params).batchId);
    input = completionSchema.parse(await readBoundedJsonBody(request, 4 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const now = new Date();
  const batch = await prisma.aiWorkflowBatch.findUnique({
    where: { id: batchId },
    select: {
      status: true,
      triggerType: true,
      leaseOwnerId: true,
      leaseTokenHash: true,
      leaseExpiresAt: true,
    },
  });
  if (
    batch?.status !== "running" ||
    batch.leaseOwnerId !== input.workerId ||
    !batch.leaseExpiresAt ||
    batch.leaseExpiresAt <= now ||
    !verifyAiWorkflowLeaseToken(input.leaseToken, batch.leaseTokenHash)
  ) return workerJsonResponse({ ok: false, code: "LEASE_INVALID" }, 409);

  const readyCandidateCount = await prisma.aiWorkflowCandidate.count({
    where: {
      batchId,
      toolId: { not: null },
      OR: [
        { status: { in: ["pending_pricing", "published"] }, fileId: { not: null } },
        { status: { in: ["reviewing", "published"] }, fileId: null },
      ],
    },
  });
  if (
    (input.state === "completed" && readyCandidateCount < 3) ||
    (input.state === "partial" && (readyCandidateCount === 0 || readyCandidateCount >= 3)) ||
    (input.state === "failed" && readyCandidateCount !== 0) ||
    (input.state === "paused" && readyCandidateCount >= 3)
  ) {
    return workerJsonResponse({ ok: false, code: "THREE_VALID_CANDIDATES_REQUIRED" }, 409);
  }

  const updated = await prisma.aiWorkflowBatch.updateMany({
    where: {
      id: batchId,
      status: "running",
      leaseOwnerId: input.workerId,
      leaseTokenHash: batch.leaseTokenHash,
      leaseExpiresAt: { gt: now },
    },
    data: {
      status: input.state,
      completedAt: input.state === "paused" ? null : now,
      failureReason: input.failureCode ?? null,
      lastWorkerStage: input.state === "paused"
        ? input.failureCode === "GITHUB_RATE_LIMIT"
          ? "rate_limit_wait"
          : input.failureCode === "NETWORK_UNAVAILABLE" ? "network_wait" : "retry_wait"
        : "complete",
      lastHeartbeatAt: now,
      leaseOwnerId: null,
      leaseTokenHash: null,
      leaseExpiresAt: input.state === "paused" ? new Date(now.getTime() + input.retryAfterSeconds! * 1000) : null,
    },
  });
  if (updated.count !== 1) return workerJsonResponse({ ok: false, code: "LEASE_INVALID" }, 409);

  const settingUpdate: Record<string, unknown> = { lastWorkerSeenAt: now };
  if (input.state === "completed") settingUpdate.lastSuccessfulRunAt = now;
  await prisma.aiWorkflowCollectionSetting.upsert({
    where: { id: "default" },
    update: settingUpdate,
    create: {
      id: "default",
      lastWorkerSeenAt: now,
      ...(input.state === "completed" ? { lastSuccessfulRunAt: now } : {}),
    },
  });
  if (input.state === "completed" && batch.triggerType === "scheduled") {
    await prisma.aiWorkflowCollectionSetting.updateMany({
      where: { id: "default", firstUnattendedSuccessAt: null, scheduledTaskEnabledAt: { not: null } },
      data: { firstUnattendedSuccessAt: now },
    });
  }

  return workerJsonResponse({
    ok: true,
    state: input.state,
    readyCandidateCount,
  });
}
