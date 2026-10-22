import type { AiWorkflowCandidate, Tool } from "@prisma/client";
import { aiWorkflowPresentationSchema, buildAiWorkflowPresentationFields } from "@/lib/ai-workflows/presentation";
import { parseAiWorkflowRepositoryLinkResult } from "@/lib/ai-workflows/worker-result";
import { buildLocalizedToolOptionalText } from "@/lib/tool-localization";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function pendingWorkflowPresentation(report: unknown) {
  const parsed = aiWorkflowPresentationSchema.safeParse(record(report).presentation);
  return parsed.success ? buildAiWorkflowPresentationFields(parsed.data) : null;
}

export function hasReviewableWorkflowPresentation(tool: Pick<Tool, "name" | "englishName" | "shortDescription" | "content" | "coverImage">) {
  return aiWorkflowPresentationSchema.safeParse({
    zh: { name: tool.name, shortDescription: buildLocalizedToolOptionalText(tool.shortDescription, "zh"), content: buildLocalizedToolOptionalText(tool.content, "zh") },
    en: { name: tool.englishName, shortDescription: buildLocalizedToolOptionalText(tool.shortDescription, "en"), content: buildLocalizedToolOptionalText(tool.content, "en") },
    cover: { url: tool.coverImage, source: tool.coverImage?.includes("/api/ai-workflows/covers/") ? "generated" : "repository" },
  }).success;
}

export function canReviewRepositoryIntroduction(candidate: AiWorkflowCandidate, tool: Tool) {
  if (candidate.status !== "reviewing" || tool.status !== "draft" || tool.type !== "ai_workflow" ||
    candidate.toolId !== tool.id || candidate.fileId || tool.downloadFileId || candidate.packageVersion || candidate.packageSha256 ||
    tool.isDownloadPaid || Number(tool.downloadPrice) !== 0 || !hasReviewableWorkflowPresentation(tool)) return false;
  const report = record(candidate.validationReport);
  const source = record(report.source);
  const license = record(report.license);
  const publication = record(report.publication);
  const parsed = parseAiWorkflowRepositoryLinkResult({
    deliveryMode: source.deliveryMode,
    repositoryId: source.repositoryId,
    repositoryUrl: source.repositoryUrl,
    commitSha: source.commitSha,
    licenseSpdx: license.spdx,
    licenseFilePath: license.filePath,
    projectType: candidate.projectType,
    stars: candidate.githubStars,
    updatedAt: source.updatedAt,
    language: source.language,
    description: "",
    failureReason: publication.reason,
  });
  if (!parsed.success) return false;
  const item = parsed.data;
  const expectedLicenseUrl = `${item.repositoryUrl}/blob/${item.commitSha}/${item.licenseFilePath.split("/").map(encodeURIComponent).join("/")}`;
  return publication.mode === "repository_link" && publication.enheDownloadPackageAvailable === false &&
    candidate.repositoryId === item.repositoryId && candidate.repositoryUrl === item.repositoryUrl &&
    candidate.repositoryOwner === item.repositoryOwner && candidate.repositoryName === item.repositoryName &&
    candidate.commitSha === item.commitSha && candidate.sourceFingerprint === item.sourceFingerprint &&
    candidate.licenseSpdx === item.licenseSpdx && candidate.licenseUrl === expectedLicenseUrl &&
    candidate.failureReason === item.failureReason && tool.onlineUrl === item.repositoryUrl;
}
