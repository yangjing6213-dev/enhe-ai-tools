import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AI_WORKFLOW_BATCH_LEASE_MS,
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
const checkpointSchema = z.object({
  candidateIndex: z.number().int().min(0).max(10_000).optional(),
  completedRepositoryIds: z.array(z.string().regex(/^\d{1,32}$/)).max(20).optional(),
}).strict();
const heartbeatSchema = z.object({
  workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
  leaseToken: z.string().min(24).max(512).regex(/^\S+$/),
  stage: z.enum(["search", "fetch", "license_review", "sandbox_test", "package", "upload", "register"]),
  checkpoint: checkpointSchema,
}).strict();

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
  let input: z.infer<typeof heartbeatSchema>;
  try {
    batchId = batchIdSchema.parse((await params).batchId);
    input = heartbeatSchema.parse(await readBoundedJsonBody(request, 8 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const now = new Date();
  const batch = await prisma.aiWorkflowBatch.findUnique({
    where: { id: batchId },
    select: { status: true, leaseOwnerId: true, leaseTokenHash: true, leaseExpiresAt: true },
  });
  if (
    batch?.status !== "running" ||
    batch.leaseOwnerId !== input.workerId ||
    !batch.leaseExpiresAt ||
    batch.leaseExpiresAt <= now ||
    !verifyAiWorkflowLeaseToken(input.leaseToken, batch.leaseTokenHash)
  ) {
    return workerJsonResponse({ ok: false, code: "LEASE_INVALID" }, 409);
  }

  const setting = await prisma.aiWorkflowCollectionSetting.upsert({
    where: { id: "default" },
    update: { lastWorkerSeenAt: now },
    create: { id: "default", lastWorkerSeenAt: now },
    select: { isPaused: true },
  });
  const paused = setting.isPaused;
  const leaseExpiresAt = paused ? null : new Date(now.getTime() + AI_WORKFLOW_BATCH_LEASE_MS);
  const updated = await prisma.aiWorkflowBatch.updateMany({
    where: {
      id: batchId,
      status: "running",
      leaseOwnerId: input.workerId,
      leaseTokenHash: batch.leaseTokenHash,
      leaseExpiresAt: { gt: now },
    },
    data: {
      checkpoint: input.checkpoint,
      lastWorkerStage: input.stage,
      lastHeartbeatAt: now,
      status: paused ? "paused" : "running",
      leaseOwnerId: paused ? null : input.workerId,
      leaseTokenHash: paused ? null : batch.leaseTokenHash,
      leaseExpiresAt,
    },
  });
  if (updated.count !== 1) return workerJsonResponse({ ok: false, code: "LEASE_INVALID" }, 409);

  return workerJsonResponse({
    ok: true,
    state: paused ? "paused" : "active",
    leaseExpiresAt: leaseExpiresAt?.toISOString() ?? null,
  });
}
