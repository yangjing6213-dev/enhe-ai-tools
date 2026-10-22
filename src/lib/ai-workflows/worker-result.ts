import { z } from "zod";
import { isLinkableOpenSourceLicenseId, isPackageRedistributableLicenseId } from "./licenses";
import { normalizeGitHubRepositoryUrl } from "@/lib/ai-workflows/rules";
import { buildAiWorkflowArchiveObjectKey } from "@/lib/ai-workflows/cos";
import { aiWorkflowPresentationSchema } from "@/lib/ai-workflows/presentation";

const environmentNames = ["windows", "wsl2", "macos", "linux", "docker"] as const;
const projectTypes = ["workflow", "automation", "agent", "template", "companion"] as const;
const repositoryLinkFailureReasons = [
  "LICENSE_NOT_REDISTRIBUTABLE",
  "PACKAGE_LANGUAGE_UNSUPPORTED",
  "NODE_MANIFEST_MISSING",
  "NODE_MANIFEST_INVALID",
  "NO_LOCKED_NODE_TEST_SUITE",
  "ARCHIVE_SIZE_LIMIT",
  "ARCHIVE_FILE_LIMIT",
  "ARCHIVE_FILE_TOO_LARGE",
  "ARCHIVE_EXPANSION_LIMIT",
  "UNSUPPORTED_GIT_LFS",
  "UNSUPPORTED_SUBMODULES",
  "CANDIDATE_TEST_FAILED",
  "PACKAGE_SIZE_LIMIT",
  "PACKAGE_FILE_TOO_LARGE",
  "CODEX_DRAFT_UNAVAILABLE",
  "CODEX_DRAFT_INVALID",
] as const;
const text = (max: number) => z.string().trim().min(1).max(max);

const rationaleSchema = z.object({
  targetUser: text(500),
  problemSolved: text(500),
  deliveryScope: text(500),
  validationEffort: text(500),
  usageBarrier: text(500),
  externalCosts: text(500),
  reason: text(800),
}).strict();

const productSchema = z.object({
  name: text(120),
  englishName: text(120),
  shortDescription: text(300),
  valueStatement: text(500),
  audience: text(800),
  painPoints: text(800),
  capabilities: text(1200),
  limitations: text(1200),
  exampleInput: text(1200),
  exampleSteps: z.array(text(300)).min(1).max(12),
  exampleOutput: text(1200),
  dependencies: text(1200),
  installGuide: text(1800),
  recoveryGuide: text(1200),
  additionalCosts: text(1200),
  modificationSummary: text(1200),
  priceSuggestionCents: z.number().int().min(1000).max(5000),
  priceRationale: rationaleSchema,
  supportedAgents: z.array(z.enum(["codex", "claude_code", "cursor", "grok", "openclaw"])).max(5).default([]),
}).strict();

const workerResultSchema = z.object({
  repositoryId: z.string().regex(/^\d{1,32}$/),
  repositoryUrl: z.string().url().max(500),
  commitSha: z.string().regex(/^[a-f0-9]{40,64}$/i),
  licenseSpdx: z.string().min(1).max(80),
  licenseFilePath: z.string().min(1).max(300),
  licenseFileSha256: z.string().regex(/^[a-f0-9]{64}$/i),
  licenseReviewSummary: text(1600),
  projectType: z.enum(projectTypes),
  stars: z.number().int().min(0).max(2_000_000_000),
  verifiedEnvironments: z.array(z.enum(environmentNames)).min(1).max(environmentNames.length),
  validation: z.object({
    command: text(240),
    exitCode: z.literal(0),
    summary: text(1600),
    recordedAt: z.string().datetime({ offset: true }),
  }).strict(),
  archive: z.object({
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    size: z.number().int().positive().max(1024 * 1024 * 1024),
    crc64: z.string().regex(/^\d{1,20}$/),
    remoteSize: z.number().int().positive(),
    remoteCrc64: z.string().regex(/^\d{1,20}$/),
    anonymousReadDenied: z.literal(true),
    bucket: z.string().min(3).max(63),
    region: z.string().min(1).max(64),
    objectKey: z.string().min(1).max(700),
    filePath: z.string().min(1).max(900),
    fileName: z.string().min(1).max(240),
    contentType: z.literal("application/zip"),
  }).strict(),
  product: productSchema,
  presentation: aiWorkflowPresentationSchema.optional(),
}).strict();

const repositoryLinkResultSchema = z.object({
  deliveryMode: z.literal("repository_link"),
  repositoryId: z.string().regex(/^\d{1,32}$/),
  repositoryUrl: z.string().url().max(500),
  commitSha: z.string().regex(/^[a-f0-9]{40,64}$/i),
  licenseSpdx: text(80),
  licenseFilePath: text(300),
  projectType: z.enum(projectTypes),
  stars: z.number().int().min(1).max(2_000_000_000),
  updatedAt: z.string().datetime({ offset: true }),
  language: z.string().max(120).nullable(),
  description: z.string().max(500),
  failureReason: z.enum(repositoryLinkFailureReasons),
  presentation: aiWorkflowPresentationSchema.optional(),
}).strict();

export type AiWorkflowWorkerProduct = z.infer<typeof productSchema>;
export type AiWorkflowWorkerResult = z.infer<typeof workerResultSchema>;
export type ParsedAiWorkflowRepositoryLinkResult = z.infer<typeof repositoryLinkResultSchema> & {
  repositoryOwner: string;
  repositoryName: string;
  repositoryUrl: string;
  commitSha: string;
  licenseSpdx: string;
  sourceFingerprint: string;
};

export type ParsedAiWorkflowWorkerResult = AiWorkflowWorkerResult & {
  repositoryOwner: string;
  repositoryName: string;
  repositoryUrl: string;
  commitSha: string;
  licenseSpdx: string;
  packageVersion: string;
  objectKey: string;
  sourceFingerprint: string;
  priceSuggestion: number;
  priceRationale: {
    targetUsers: string;
    problem: string;
    deliverables: string;
    verification: string;
    difficulty: string;
    externalCosts: string;
    reason: string;
  };
};

export function parseAiWorkflowWorkerResult(value: unknown, expectedDownloadBucket = process.env.COS_DOWNLOAD_BUCKET?.trim() || "enhe-downloads-1303691623") {
  const parsed = workerResultSchema.safeParse(value);
  if (!parsed.success) return { success: false as const, error: "INVALID_RESULT" as const };

  const data = parsed.data;
  const repository = normalizeGitHubRepositoryUrl(data.repositoryUrl);
  const commitSha = data.commitSha.toLowerCase();
  const licenseSpdx = data.licenseSpdx.trim();
  const archiveSha256 = data.archive.sha256.toLowerCase();
  const expectedObjectKey = buildAiWorkflowArchiveObjectKey(data.repositoryId, commitSha, archiveSha256);
  const licensePath = data.licenseFilePath.replaceAll("\\", "/");

  if (
    !repository ||
    !isPackageRedistributableLicenseId(licenseSpdx) ||
    !licensePath || licensePath.startsWith("/") || licensePath.split("/").some((part) => part === "..") || /^[a-z]:/i.test(licensePath) ||
    data.archive.bucket !== expectedDownloadBucket ||
    data.archive.region !== (process.env.COS_REGION?.trim() || "ap-shanghai") ||
    data.archive.objectKey !== expectedObjectKey ||
    data.archive.filePath !== `cos://${expectedDownloadBucket}/${expectedObjectKey}` ||
    data.archive.remoteSize !== data.archive.size ||
    data.archive.crc64 !== data.archive.remoteCrc64 ||
    !data.archive.fileName.toLowerCase().endsWith(".zip") ||
    /(?:api[_-]?key|secret|password|token|authorization)\s*[:=]/i.test(`${data.validation.command}\n${data.validation.summary}`)
  ) return { success: false as const, error: "RESULT_EVIDENCE_MISMATCH" as const };

  const rationale = data.product.priceRationale;
  return {
    success: true as const,
    data: {
      ...data,
      repositoryUrl: repository.url,
      repositoryOwner: repository.owner,
      repositoryName: repository.name,
      commitSha,
      licenseSpdx,
      packageVersion: commitSha,
      objectKey: expectedObjectKey,
      sourceFingerprint: `${data.repositoryId}:${commitSha}`,
      priceSuggestion: data.product.priceSuggestionCents / 100,
      priceRationale: {
        targetUsers: rationale.targetUser,
        problem: rationale.problemSolved,
        deliverables: rationale.deliveryScope,
        verification: rationale.validationEffort,
        difficulty: rationale.usageBarrier,
        externalCosts: rationale.externalCosts,
        reason: rationale.reason,
      },
    } satisfies ParsedAiWorkflowWorkerResult,
  };
}

export function parseAiWorkflowRepositoryLinkResult(value: unknown) {
  const parsed = repositoryLinkResultSchema.safeParse(value);
  if (!parsed.success) return { success: false as const, error: "INVALID_LINK_RESULT" as const };

  const data = parsed.data;
  const repository = normalizeGitHubRepositoryUrl(data.repositoryUrl);
  const licenseSpdx = data.licenseSpdx.trim();
  const licensePath = data.licenseFilePath.replaceAll("\\", "/");
  const description = data.description
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, "[已隐藏疑似密钥]")
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{32,})\b/g, "[已隐藏疑似密钥]")
    .replace(/((?:api[_-]?key|secret|password|token|authorization)\s*[:=]\s*)[^\s,;]+/gi, "$1[已隐藏]")
    .trim();

  if (
    !repository ||
    !isLinkableOpenSourceLicenseId(licenseSpdx) ||
    !licensePath || licensePath.startsWith("/") || licensePath.split("/").some((part) => part === "..") || /^[a-z]:/i.test(licensePath)
  ) return { success: false as const, error: "LINK_RESULT_EVIDENCE_MISMATCH" as const };

  return {
    success: true as const,
    data: {
      ...data,
      description,
      repositoryUrl: repository.url,
      repositoryOwner: repository.owner,
      repositoryName: repository.name,
      commitSha: data.commitSha.toLowerCase(),
      licenseSpdx,
      licenseFilePath: licensePath,
      sourceFingerprint: `${data.repositoryId}:${data.commitSha.toLowerCase()}`,
    } satisfies ParsedAiWorkflowRepositoryLinkResult,
  };
}

function safeProductText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/https?:\/\//gi, "https：//")
    .trim();
}

export function buildAiWorkflowProductContent(product: AiWorkflowWorkerProduct) {
  const lines = [
    `价值说明\n${product.valueStatement}`,
    `适合人群与场景\n${product.audience}`,
    `解决的问题\n${product.painPoints}`,
    `主要能力\n${product.capabilities}`,
    `适用边界\n${product.limitations}`,
    `使用示例\n输入：${product.exampleInput}\n步骤：${product.exampleSteps.join("；")}\n产出：${product.exampleOutput}`,
    `安装与使用\n${product.installGuide}`,
    `依赖与额外成本\n依赖：${product.dependencies}\n可能产生的外部费用：${product.additionalCosts}`,
    `卸载与恢复\n${product.recoveryGuide}`,
    `本次整理内容\n${product.modificationSummary}`,
  ];
  return lines.map((section) => section.split("\n").map(safeProductText).join("\n")).join("\n\n");
}
