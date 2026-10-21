export function canReviewAiWorkflow(input: {
  isPaid: boolean;
  hasActivePurchase: boolean;
  hasDownloaded: boolean;
}) {
  return input.isPaid ? input.hasActivePurchase : input.hasDownloaded;
}

export function resolveAiWorkflowDownloadFileId(input: {
  isPaid: boolean;
  currentFileId: string | null;
  purchasedFileId: string | null;
}) {
  if (!input.currentFileId) return null;
  if (!input.isPaid) return input.currentFileId;
  return input.purchasedFileId;
}

export function isAiWorkflowPurchaseReady(input: {
  candidateStatus: string;
  candidateFileId: string | null;
  toolFileId: string | null;
  isDownloadPaid: boolean;
  downloadPrice: number;
  priceDecision: "paid" | "free" | null;
  confirmedPrice: number;
}) {
  if (input.candidateStatus !== "published" || !input.toolFileId || input.candidateFileId !== input.toolFileId) return false;
  if (!Number.isFinite(input.downloadPrice) || !Number.isFinite(input.confirmedPrice) || input.downloadPrice !== input.confirmedPrice) return false;
  if (input.isDownloadPaid) {
    return input.priceDecision === "paid" && input.downloadPrice >= 10 && input.downloadPrice <= 50 && Math.round(input.downloadPrice * 100) === input.downloadPrice * 100;
  }
  return input.priceDecision === "free" && input.downloadPrice === 0;
}

export function resolveAiWorkflowDeliveryMode(input: {
  candidateStatus: string;
  candidateFileId: string | null;
  toolFileId: string | null;
}): "package" | "repository_link" {
  return input.candidateStatus === "published" && input.candidateFileId && input.candidateFileId === input.toolFileId
    ? "package"
    : "repository_link";
}

export function isAiWorkflowArchiveReady(input: {
  repositoryId: string;
  commitSha: string | null;
  sourceFingerprint: string;
  licenseSpdx: string | null;
  candidateFileId: string | null;
  toolFileId: string | null;
  packageVersion: string | null;
  packageSize: bigint | number | null;
  packageSha256: string | null;
  validationReport: unknown;
  productName: string;
  productDescription: string;
  productContent: string;
  verifiedEnvironments: string[];
  fileId: string | null;
  filePath: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileStorageBucket: string | null;
  fileObjectKey: string | null;
  fileSize: bigint | number | null;
  fileSha256: string | null;
  fileVersion: string | null;
  expectedDownloadBucket: string;
}) {
  const commit = input.commitSha?.trim().toLowerCase() ?? "";
  const packageSha = input.packageSha256?.trim().toLowerCase() ?? "";
  const objectKey = input.fileObjectKey?.trim() ?? "";
  const expectedObjectKey = `ai-workflows/${input.repositoryId}/${commit}/${packageSha}.zip`;
  const packageSize = Number(input.packageSize ?? 0);
  const fileSize = Number(input.fileSize ?? 0);
  const report = input.validationReport && typeof input.validationReport === "object" && !Array.isArray(input.validationReport)
    ? input.validationReport as Record<string, unknown>
    : null;
  const source = report?.source && typeof report.source === "object" && !Array.isArray(report.source) ? report.source as Record<string, unknown> : null;
  const license = report?.license && typeof report.license === "object" && !Array.isArray(report.license) ? report.license as Record<string, unknown> : null;
  const validation = report?.validation && typeof report.validation === "object" && !Array.isArray(report.validation) ? report.validation as Record<string, unknown> : null;
  const archive = report?.archive && typeof report.archive === "object" && !Array.isArray(report.archive) ? report.archive as Record<string, unknown> : null;
  const allowedLicense = new Set(["0BSD", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MIT", "MPL-2.0"]);
  const verifiedEvidence = Boolean(
    source?.repositoryId === input.repositoryId &&
    typeof source.commitSha === "string" && source.commitSha.toLowerCase() === commit &&
    typeof source.repositoryUrl === "string" && /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(source.repositoryUrl) &&
    typeof input.licenseSpdx === "string" && allowedLicense.has(input.licenseSpdx) && license?.spdx === input.licenseSpdx &&
    typeof license.filePath === "string" && license.filePath.length > 0 && !license.filePath.split(/[\\/]/).includes("..") &&
    typeof license.fileSha256 === "string" && /^[a-f0-9]{64}$/i.test(license.fileSha256) &&
    typeof license.reviewSummary === "string" && license.reviewSummary.trim().length >= 20 &&
    validation?.exitCode === 0 && typeof validation.command === "string" && validation.command.trim() &&
    typeof validation.summary === "string" && validation.summary.trim() &&
    typeof validation.recordedAt === "string" && Number.isFinite(Date.parse(validation.recordedAt)) &&
    archive?.bucket === input.expectedDownloadBucket && archive.objectKey === expectedObjectKey &&
    archive.sha256 === packageSha && Number(archive.size) === packageSize &&
    Number(archive.remoteSize) === packageSize && typeof archive.crc64 === "string" && archive.crc64 === archive.remoteCrc64 &&
    archive.anonymousReadDenied === true && archive.contentType === "application/zip"
  );
  return Boolean(
    /^\d+$/.test(input.repositoryId) &&
    /^[a-f0-9]{40,64}$/.test(commit) &&
    input.sourceFingerprint === `${input.repositoryId}:${commit}` &&
    allowedLicense.has(input.licenseSpdx ?? "") &&
    input.candidateFileId && input.candidateFileId === input.toolFileId && input.candidateFileId === input.fileId &&
    input.packageVersion?.trim() && input.fileVersion === input.packageVersion &&
    Number.isFinite(packageSize) && packageSize > 0 && fileSize === packageSize &&
    /^[a-f0-9]{64}$/.test(packageSha) && input.fileSha256?.toLowerCase() === packageSha &&
    verifiedEvidence &&
    input.productName.trim() && input.productDescription.trim() && input.productContent.trim() &&
    input.verifiedEnvironments.length > 0 &&
    input.fileStorageBucket === input.expectedDownloadBucket &&
    input.fileName?.toLowerCase().endsWith(".zip") &&
    input.fileMimeType === "application/zip" &&
    objectKey === expectedObjectKey &&
    input.filePath === `cos://${input.expectedDownloadBucket}/${expectedObjectKey}`
  );
}

export function normalizeGitHubRepositoryUrl(value: string) {
  const input = value.trim();
  const httpsMatch = input.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  const sshMatch = input.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const match = httpsMatch ?? sshMatch;
  if (!match) return null;

  const [, owner, name] = match;
  if (!owner || !name || owner === "." || owner === ".." || name === "." || name === "..") return null;
  if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) return null;
  return { owner, name, url: `https://github.com/${owner}/${name}` };
}
