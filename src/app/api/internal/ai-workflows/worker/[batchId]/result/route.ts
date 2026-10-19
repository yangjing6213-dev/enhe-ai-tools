import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAiWorkflowCosConfig } from "@/lib/ai-workflows/cos";
import { buildAiWorkflowProductContent, parseAiWorkflowWorkerResult } from "@/lib/ai-workflows/worker-result";
import { verifyAiWorkflowLeaseToken } from "@/lib/ai-workflows/worker";
import {
  readBoundedJsonBody,
  verifyWorkerAuthorization,
  workerJsonResponse,
  workerUnauthorizedResponse,
} from "@/lib/seo-audit/worker-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const batchIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const requestSchema = z.object({
  workerId: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
  leaseToken: z.string().min(24).max(512).regex(/^\S+$/),
  result: z.unknown(),
}).strict();

class IntakeError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

function validLease(input: { leaseOwnerId: string | null; leaseTokenHash: string | null; leaseExpiresAt: Date | null; status: string } | null, workerId: string, leaseToken: string, now: Date) {
  return Boolean(
    input?.status === "running" &&
    input.leaseOwnerId === workerId &&
    input.leaseExpiresAt && input.leaseExpiresAt > now &&
    verifyAiWorkflowLeaseToken(leaseToken, input.leaseTokenHash)
  );
}

function normalizeSlugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "workflow";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const workerToken = process.env.AI_WORKFLOW_WORKER_TOKEN?.trim();
  if (!workerToken) return workerJsonResponse({ ok: false, code: "WORKER_NOT_CONFIGURED" }, 503);
  if (!verifyWorkerAuthorization(request.headers.get("authorization"), {
    AUDIT_WORKER_TOKEN_CURRENT: workerToken,
  })) return workerUnauthorizedResponse();

  const cosConfig = getAiWorkflowCosConfig();
  if (!cosConfig) return workerJsonResponse({ ok: false, code: "COS_NOT_CONFIGURED" }, 503);

  let batchId: string;
  let input: z.infer<typeof requestSchema>;
  try {
    batchId = batchIdSchema.parse((await params).batchId);
    input = requestSchema.parse(await readBoundedJsonBody(request, 96 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const parsed = parseAiWorkflowWorkerResult(input.result, cosConfig.downloadBucket);
  if (!parsed.success) return workerJsonResponse({ ok: false, code: parsed.error }, 400);

  const now = new Date();
  const [batch, setting] = await Promise.all([
    prisma.aiWorkflowBatch.findUnique({
      where: { id: batchId },
      select: { status: true, topicId: true, topicNameSnapshot: true, leaseOwnerId: true, leaseTokenHash: true, leaseExpiresAt: true },
    }),
    prisma.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" }, select: { isPaused: true } }),
  ]);
  if (!validLease(batch, input.workerId, input.leaseToken, now)) {
    return workerJsonResponse({ ok: false, code: "LEASE_INVALID" }, 409);
  }
  if (setting?.isPaused) return workerJsonResponse({ ok: false, code: "COLLECTION_PAUSED" }, 409);

  const item = parsed.data;
  const objectKey = item.objectKey;
  const validationReport: Prisma.InputJsonObject = {
    source: {
      repositoryId: item.repositoryId,
      repositoryUrl: item.repositoryUrl,
      commitSha: item.commitSha,
    },
    license: {
      spdx: item.licenseSpdx,
      filePath: item.licenseFilePath,
      fileSha256: item.licenseFileSha256.toLowerCase(),
      reviewSummary: item.licenseReviewSummary,
    },
    validation: {
      command: item.validation.command,
      exitCode: item.validation.exitCode,
      summary: item.validation.summary,
      recordedAt: item.validation.recordedAt,
    },
    archive: {
      bucket: item.archive.bucket,
      region: item.archive.region,
      objectKey,
      size: item.archive.size,
      sha256: item.archive.sha256.toLowerCase(),
      crc64: item.archive.crc64,
      remoteSize: item.archive.remoteSize,
      remoteCrc64: item.archive.remoteCrc64,
      anonymousReadDenied: item.archive.anonymousReadDenied,
      contentType: item.archive.contentType,
    },
  };
  const content = buildAiWorkflowProductContent(item.product);
  const slug = `ai-workflow-${normalizeSlugPart(item.repositoryName)}-${item.repositoryId}-${item.commitSha.slice(0, 12)}`;
  const licenseUrl = `${item.repositoryUrl}/blob/${item.commitSha}/${item.licenseFilePath.split("/").map(encodeURIComponent).join("/")}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentSetting = await tx.aiWorkflowCollectionSetting.findUnique({ where: { id: "default" }, select: { isPaused: true } });
      if (currentSetting?.isPaused) throw new IntakeError(409, "COLLECTION_PAUSED");

      const currentBatch = await tx.aiWorkflowBatch.findUnique({
        where: { id: batchId },
        select: { status: true, topicId: true, topicNameSnapshot: true, leaseOwnerId: true, leaseTokenHash: true, leaseExpiresAt: true },
      });
      if (!validLease(currentBatch, input.workerId, input.leaseToken, new Date())) throw new IntakeError(409, "LEASE_INVALID");

      const existing = await tx.aiWorkflowCandidate.findUnique({
        where: { repositoryId: item.repositoryId },
        select: { id: true, batchId: true, commitSha: true },
      });
      if (existing) {
        if (existing.batchId === batchId && existing.commitSha?.toLowerCase() === item.commitSha) {
          return { candidateId: existing.id, created: false };
        }
        throw new IntakeError(409, "REPOSITORY_ALREADY_REGISTERED");
      }

      const tool = await tx.tool.create({
        data: {
          name: item.product.name,
          englishName: item.product.englishName,
          slug,
          type: "ai_workflow",
          shortDescription: item.product.shortDescription,
          content,
          version: item.packageVersion,
          systemRequirement: item.product.dependencies,
          supportedAgents: item.product.supportedAgents,
          isVipRequired: false,
          isDownloadPaid: false,
          isDownloadLinkVipOnly: true,
          downloadPrice: 0,
          downloadCount: 0,
          status: "draft",
        },
        select: { id: true },
      });
      const file = await tx.file.create({
        data: {
          toolId: tool.id,
          fileName: item.archive.fileName,
          filePath: `cos://${cosConfig.downloadBucket}/${objectKey}`,
          fileSize: BigInt(item.archive.size),
          storageBucket: cosConfig.downloadBucket,
          storageRegion: cosConfig.region,
          objectKey,
          sha256: item.archive.sha256.toLowerCase(),
          version: item.packageVersion,
          mimeType: "application/zip",
        },
        select: { id: true },
      });
      await tx.tool.update({ where: { id: tool.id }, data: { downloadFileId: file.id }, select: { id: true } });
      const candidate = await tx.aiWorkflowCandidate.create({
        data: {
          batchId,
          topicId: currentBatch?.topicId ?? null,
          repositoryId: item.repositoryId,
          sourceFingerprint: item.sourceFingerprint,
          repositoryUrl: item.repositoryUrl,
          repositoryOwner: item.repositoryOwner,
          repositoryName: item.repositoryName,
          commitSha: item.commitSha,
          licenseSpdx: item.licenseSpdx,
          licenseUrl,
          projectType: item.projectType,
          verifiedEnvironments: [...new Set(item.verifiedEnvironments)],
          githubStars: item.stars,
          starsUpdatedAt: new Date(),
          validationReport,
          modificationSummary: item.product.modificationSummary,
          fileId: file.id,
          packageVersion: item.packageVersion,
          packageSize: BigInt(item.archive.size),
          packageSha256: item.archive.sha256.toLowerCase(),
          priceSuggestion: item.priceSuggestion,
          priceRationale: item.priceRationale,
          status: "pending_pricing",
          toolId: tool.id,
        },
        select: { id: true },
      });

      const heartbeat = await tx.aiWorkflowBatch.updateMany({
        where: {
          id: batchId,
          status: "running",
          leaseOwnerId: input.workerId,
          leaseTokenHash: currentBatch?.leaseTokenHash,
          leaseExpiresAt: { gt: new Date() },
        },
        data: { lastWorkerStage: "register", lastHeartbeatAt: new Date() },
      });
      if (heartbeat.count !== 1) throw new IntakeError(409, "LEASE_INVALID");

      return { candidateId: candidate.id, created: true };
    });

    return workerJsonResponse({
      ok: true,
      candidateId: result.candidateId,
      state: "pending_pricing",
      idempotentReplay: !result.created,
    }, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof IntakeError) return workerJsonResponse({ ok: false, code: error.code }, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return workerJsonResponse({ ok: false, code: "REPOSITORY_ALREADY_REGISTERED" }, 409);
    }
    throw error;
  }
}
