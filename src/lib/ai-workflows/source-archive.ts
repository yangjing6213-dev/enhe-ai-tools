import { z } from "zod";
import { buildAiWorkflowSourceArchiveObjectKey } from "./cos";
import { isPackageRedistributableLicenseId } from "./licenses";
import { normalizeGitHubRepositoryUrl } from "./rules";

export const AI_WORKFLOW_SOURCE_ARCHIVE_MAX_BYTES = 120 * 1024 * 1024;

const sourceArchiveFailureReasons = [
  "LICENSE_NOT_REDISTRIBUTABLE",
  "ARCHIVE_SIZE_LIMIT",
  "GITHUB_ARCHIVE_UNAVAILABLE",
  "SOURCE_ARCHIVE_INVALID",
  "COS_MIRROR_FAILED",
] as const;

const sourceArchiveEvidenceSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().positive().max(AI_WORKFLOW_SOURCE_ARCHIVE_MAX_BYTES),
  crc64: z.string().regex(/^\d{1,20}$/),
  remoteSize: z.number().int().positive(),
  remoteCrc64: z.string().regex(/^\d{1,20}$/),
  anonymousReadDenied: z.literal(true),
  bucket: z.string().min(3).max(63),
  region: z.string().min(1).max(64),
  objectKey: z.string().min(1).max(700),
  filePath: z.string().min(1).max(900),
  contentType: z.literal("application/zip"),
}).strict();

export const aiWorkflowSourceArchiveDeliverySchema = z.discriminatedUnion("deliveryMode", [
  z.object({
    deliveryMode: z.literal("github"),
    upstreamUrl: z.string().url().max(1000),
    failureReason: z.enum(sourceArchiveFailureReasons).optional(),
  }).strict(),
  z.object({
    deliveryMode: z.literal("cos"),
    upstreamUrl: z.string().url().max(1000),
    archive: sourceArchiveEvidenceSchema,
  }).strict(),
]);

export type AiWorkflowSourceArchiveDelivery = z.infer<typeof aiWorkflowSourceArchiveDeliverySchema>;

export function buildAiWorkflowGitHubSourceArchiveUrl(repositoryUrl: string, commitSha: string) {
  const repository = normalizeGitHubRepositoryUrl(repositoryUrl);
  const commit = commitSha.trim().toLowerCase();
  if (!repository || !/^[a-f0-9]{40,64}$/.test(commit)) return null;
  return `https://github.com/${repository.owner}/${repository.name}/archive/${commit}.zip`;
}

export function buildAiWorkflowSourceArchiveFileName(repositoryUrl: string, commitSha: string) {
  const repository = normalizeGitHubRepositoryUrl(repositoryUrl);
  const commit = commitSha.trim().toLowerCase();
  if (!repository || !/^[a-f0-9]{40,64}$/.test(commit)) return null;
  const safeName = repository.name.replace(/[^A-Za-z0-9_.-]/g, "-").slice(0, 160) || "repository";
  return `${safeName}-${commit.slice(0, 8)}-source.zip`;
}

export function parseAiWorkflowSourceArchiveDelivery(
  value: unknown,
  context: {
    repositoryId: string;
    repositoryUrl: string;
    commitSha: string;
    licenseSpdx: string | null;
    downloadBucket?: string;
    region?: string;
  },
) {
  const parsed = aiWorkflowSourceArchiveDeliverySchema.safeParse(value);
  if (!parsed.success) return null;

  const commitSha = context.commitSha.trim().toLowerCase();
  const upstreamUrl = buildAiWorkflowGitHubSourceArchiveUrl(context.repositoryUrl, commitSha);
  if (!upstreamUrl || parsed.data.upstreamUrl !== upstreamUrl) return null;
  if (parsed.data.deliveryMode === "github") return parsed.data;

  const archive = parsed.data.archive;
  const bucket = context.downloadBucket?.trim() || process.env.COS_DOWNLOAD_BUCKET?.trim() || "enhe-downloads-1303691623";
  const region = context.region?.trim() || process.env.COS_REGION?.trim() || "ap-shanghai";
  let expectedObjectKey: string;
  try {
    expectedObjectKey = buildAiWorkflowSourceArchiveObjectKey(context.repositoryId, commitSha, archive.sha256.toLowerCase());
  } catch {
    return null;
  }

  if (
    !context.licenseSpdx ||
    !isPackageRedistributableLicenseId(context.licenseSpdx) ||
    archive.bucket !== bucket ||
    archive.region !== region ||
    archive.objectKey !== expectedObjectKey ||
    archive.filePath !== `cos://${bucket}/${expectedObjectKey}` ||
    archive.remoteSize !== archive.size ||
    archive.remoteCrc64 !== archive.crc64
  ) return null;

  return parsed.data;
}

export function getAiWorkflowSourceArchiveDeliveryFromReport(
  validationReport: unknown,
  context: Parameters<typeof parseAiWorkflowSourceArchiveDelivery>[1],
) {
  if (!validationReport || typeof validationReport !== "object" || Array.isArray(validationReport)) return null;
  return parseAiWorkflowSourceArchiveDelivery(
    (validationReport as Record<string, unknown>).sourceArchive,
    context,
  );
}
