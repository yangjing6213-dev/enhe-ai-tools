import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAiWorkflowCosConfig } from "@/lib/ai-workflows/cos";
import { buildAiWorkflowProductContent, parseAiWorkflowRepositoryLinkResult, parseAiWorkflowWorkerResult } from "@/lib/ai-workflows/worker-result";
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

  let batchId: string;
  let input: z.infer<typeof requestSchema>;
  try {
    batchId = batchIdSchema.parse((await params).batchId);
    input = requestSchema.parse(await readBoundedJsonBody(request, 96 * 1024));
  } catch {
    return workerJsonResponse({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const parsedPackage = parseAiWorkflowWorkerResult(input.result, cosConfig?.downloadBucket);
  const parsedLink = parseAiWorkflowRepositoryLinkResult(input.result);
  if (!parsedPackage.success && !parsedLink.success) return workerJsonResponse({ ok: false, code: parsedPackage.error }, 400);

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

  if (parsedLink.success) {
    const item = parsedLink.data;
    const now = new Date();
    const licenseUrl = `${item.repositoryUrl}/blob/${item.commitSha}/${item.licenseFilePath.split("/").map(encodeURIComponent).join("/")}`;
    const description = item.description || "GitHub 未提供项目简介。";
    const linkOnlyContent = [
      `GitHub 项目简介（原始信息）\n${description}`,
      `收录说明\n本条目来源于 GitHub 原仓库。请查看页面标注的获取方式和核验状态，并前往 GitHub 查看最新内容、使用条件和许可证。`,
    ].join("\n\n");
    const validationReport: Prisma.InputJsonObject = {
      source: {
        deliveryMode: "repository_link",
        repositoryId: item.repositoryId,
        repositoryUrl: item.repositoryUrl,
        commitSha: item.commitSha,
        language: item.language,
        updatedAt: item.updatedAt,
      },
      license: { spdx: item.licenseSpdx, filePath: item.licenseFilePath, verifiedFrom: "GitHub repository license metadata" },
      popularity: { githubStars: item.stars, checkedAt: now.toISOString() },
      publication: {
        mode: "repository_link",
        reason: item.failureReason,
        enheDownloadPackageAvailable: false,
        descriptionSource: "GitHub repository metadata",
      },
    };
    const toolData = {
      name: item.repositoryName,
      englishName: item.repositoryOwner + "/" + item.repositoryName,
      shortDescription: description.slice(0, 300),
      content: linkOnlyContent,
      version: null,
      systemRequirement: item.language,
      supportedAgents: [],
      onlineUrl: item.repositoryUrl,
      isVipRequired: false,
      isDownloadPaid: false,
      isDownloadLinkVipOnly: false,
      downloadPrice: 0,
      status: "published" as const,
    };

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
          select: { id: true, batchId: true, commitSha: true, status: true, fileId: true, toolId: true },
        });
        let candidateId: string;
        let created = false;
        if (existing) {
          if (existing.status !== "published" || existing.fileId || !existing.toolId) throw new IntakeError(409, "REPOSITORY_ALREADY_REGISTERED");
          await tx.tool.update({ where: { id: existing.toolId }, data: toolData });
          await tx.aiWorkflowCandidate.update({
            where: { id: existing.id },
            data: {
              batchId,
              topicId: currentBatch?.topicId ?? null,
              sourceFingerprint: item.sourceFingerprint,
              repositoryUrl: item.repositoryUrl,
              repositoryOwner: item.repositoryOwner,
              repositoryName: item.repositoryName,
              commitSha: item.commitSha,
              licenseSpdx: item.licenseSpdx,
              licenseUrl,
              projectType: item.projectType,
              verifiedEnvironments: [],
              githubStars: item.stars,
              starsUpdatedAt: now,
              validationReport,
              modificationSummary: "仅收录 GitHub 原仓库链接；本站未制作下载包，未通过下载版发布流程。",
              failureReason: item.failureReason,
              status: "published",
            },
          });
          candidateId = existing.id;
        } else {
          const tool = await tx.tool.create({
            data: {
              ...toolData,
              slug: `ai-workflow-${item.repositoryId}-${normalizeSlugPart(item.repositoryName)}`,
              type: "ai_workflow",
              downloadCount: 0,
              sortOrder: Math.max(0, 1_000_000 - Math.min(item.stars, 999_999)),
            },
            select: { id: true },
          });
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
              verifiedEnvironments: [],
              githubStars: item.stars,
              starsUpdatedAt: now,
              validationReport,
              modificationSummary: "仅收录 GitHub 原仓库链接；本站未制作下载包，未通过下载版发布流程。",
              failureReason: item.failureReason,
              status: "published",
              toolId: tool.id,
            },
            select: { id: true },
          });
          candidateId = candidate.id;
          created = true;
        }

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
        return { candidateId, created };
      });

      return workerJsonResponse({ ok: true, candidateId: result.candidateId, state: "published", deliveryMode: "repository_link", idempotentReplay: !result.created }, result.created ? 201 : 200);
    } catch (error) {
      if (error instanceof IntakeError) return workerJsonResponse({ ok: false, code: error.code }, error.status);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return workerJsonResponse({ ok: false, code: "REPOSITORY_ALREADY_REGISTERED" }, 409);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("[ai-workflow-link-intake] registration failed", { batchId, errorType: error.name, prismaCode: error.code });
        return workerJsonResponse({ ok: false, code: `DATABASE_${error.code}` }, 500);
      }
      if (error instanceof Prisma.PrismaClientValidationError) {
        console.error("[ai-workflow-link-intake] registration failed", { batchId, errorType: error.name });
        return workerJsonResponse({ ok: false, code: "DATABASE_VALIDATION_ERROR" }, 500);
      }
      console.error("[ai-workflow-link-intake] registration failed", { batchId, errorType: error instanceof Error ? error.name : typeof error });
      return workerJsonResponse({ ok: false, code: "LINK_REGISTRATION_FAILED" }, 500);
    }
  }

  if (!parsedPackage.success) return workerJsonResponse({ ok: false, code: "INVALID_RESULT" }, 400);
  if (!cosConfig) return workerJsonResponse({ ok: false, code: "COS_NOT_CONFIGURED" }, 503);

  const item = parsedPackage.data;
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
        select: { id: true, batchId: true, commitSha: true, status: true, fileId: true, toolId: true },
      });
      if (existing) {
        if (existing.batchId === batchId && existing.commitSha?.toLowerCase() === item.commitSha && (existing.fileId || existing.status !== "published")) {
          return { candidateId: existing.id, created: false, state: existing.status };
        }
        if (existing.status === "published" && !existing.fileId && existing.toolId) {
          const file = await tx.file.create({
            data: {
              toolId: existing.toolId,
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
          await tx.tool.update({
            where: { id: existing.toolId },
            data: { downloadFileId: file.id, version: item.packageVersion, isDownloadPaid: false, isDownloadLinkVipOnly: true, downloadPrice: 0, status: "published" },
          });
          await tx.aiWorkflowCandidate.update({
            where: { id: existing.id },
            data: {
              batchId,
              topicId: currentBatch?.topicId ?? null,
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
              confirmedPrice: null,
              priceDecision: null,
              pricingApproverId: null,
              pricingApprovedAt: null,
              failureReason: null,
              status: "pending_pricing",
            },
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
          return { candidateId: existing.id, created: false, state: "pending_pricing" };
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

      return { candidateId: candidate.id, created: true, state: "pending_pricing" };
    });

    return workerJsonResponse({
      ok: true,
      candidateId: result.candidateId,
      state: result.state,
      deliveryMode: "package",
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
