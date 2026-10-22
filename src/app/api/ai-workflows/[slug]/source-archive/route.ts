import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAiWorkflowCosConfig, getAiWorkflowDownloadUrl } from "@/lib/ai-workflows/cos";
import {
  buildAiWorkflowGitHubSourceArchiveUrl,
  buildAiWorkflowSourceArchiveFileName,
  getAiWorkflowSourceArchiveDeliveryFromReport,
} from "@/lib/ai-workflows/source-archive";
import { consumeCustomerSupportRateLimit } from "@/lib/customer-support-rate-limit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function privateJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Pragma: "no-cache" },
  });
}

function privateRedirect(url: string) {
  const response = NextResponse.redirect(url, { status: 302 });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function getRecordedCommitSha(candidate: { commitSha: string | null; validationReport: unknown }) {
  if (candidate.commitSha?.trim()) return candidate.commitSha;
  if (!candidate.validationReport || typeof candidate.validationReport !== "object" || Array.isArray(candidate.validationReport)) return "";
  const source = (candidate.validationReport as Record<string, unknown>).source;
  if (!source || typeof source !== "object" || Array.isArray(source)) return "";
  const commitSha = (source as Record<string, unknown>).commitSha;
  return typeof commitSha === "string" ? commitSha : "";
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const source = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rateKey = `aiw-source:${createHash("sha256").update(source).digest("hex")}`;
  if (!consumeCustomerSupportRateLimit(rateKey)) return privateJson({ error: "RATE_LIMITED" }, 429);

  const { slug } = await params;
  const tool = await prisma.tool.findFirst({
    where: { slug, type: "ai_workflow", status: "published" },
    select: {
      aiWorkflowCandidate: {
        select: {
          status: true,
          repositoryId: true,
          repositoryUrl: true,
          commitSha: true,
          licenseSpdx: true,
          validationReport: true,
        },
      },
    },
  });
  const candidate = tool?.aiWorkflowCandidate;
  if (!candidate || candidate.status !== "published") return privateJson({ error: "NOT_FOUND" }, 404);

  const commitSha = getRecordedCommitSha(candidate);
  const upstreamUrl = buildAiWorkflowGitHubSourceArchiveUrl(candidate.repositoryUrl, commitSha);
  const fileName = buildAiWorkflowSourceArchiveFileName(candidate.repositoryUrl, commitSha);
  if (!upstreamUrl || !fileName) return privateJson({ error: "SOURCE_METADATA_UNAVAILABLE" }, 503);

  const cosConfig = getAiWorkflowCosConfig();
  const sourceArchive = getAiWorkflowSourceArchiveDeliveryFromReport(candidate.validationReport, {
    repositoryId: candidate.repositoryId,
    repositoryUrl: candidate.repositoryUrl,
    commitSha,
    licenseSpdx: candidate.licenseSpdx,
    downloadBucket: cosConfig?.downloadBucket,
    region: cosConfig?.region,
  });

  if (sourceArchive?.deliveryMode === "cos" && cosConfig) {
    try {
      const signedUrl = getAiWorkflowDownloadUrl({
        fileName,
        filePath: sourceArchive.archive.filePath,
        storageBucket: sourceArchive.archive.bucket,
        objectKey: sourceArchive.archive.objectKey,
      });
      return privateRedirect(signedUrl);
    } catch {
      // The public upstream archive remains available if COS signing is temporarily unavailable.
    }
  }

  return privateRedirect(upstreamUrl);
}
