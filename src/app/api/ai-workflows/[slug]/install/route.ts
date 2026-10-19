import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getAiWorkflowCosConfig, getAiWorkflowDownloadUrl } from "@/lib/ai-workflows/cos";
import { buildAiWorkflowInstallInstruction, resolveAiWorkflowRuntime } from "@/lib/ai-workflows/install";
import { isAiWorkflowPurchaseReady, normalizeGitHubRepositoryUrl } from "@/lib/ai-workflows/rules";
import { consumeCustomerSupportRateLimit } from "@/lib/customer-support-rate-limit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const installInput = z.object({
  agent: z.enum(["codex", "claude_code", "cursor", "grok", "openclaw"]),
  runtime: z.enum(["windows", "wsl2", "macos", "linux", "docker"]),
  locale: z.enum(["zh", "en"]).default("zh"),
});

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Pragma: "no-cache", Vary: "Cookie" },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const viewer = await getCurrentUser();
  const source = viewer?.id || request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rateKey = `aiw-install:${createHash("sha256").update(source).digest("hex")}`;
  if (!consumeCustomerSupportRateLimit(rateKey)) return privateJson({ error: "RATE_LIMITED" }, 429);

  let input: z.infer<typeof installInput>;
  try { input = installInput.parse(await request.json()); }
  catch { return privateJson({ error: "INVALID_REQUEST" }, 400); }

  const { slug } = await params;
  const tool = await prisma.tool.findFirst({
    where: { slug, type: "ai_workflow", status: "published" },
    include: {
      downloadFile: true,
      aiWorkflowCandidate: true,
      priceSpecs: { where: { status: "active" }, select: { status: true } },
    },
  });
  const candidate = tool?.aiWorkflowCandidate;
  if (!tool || !candidate) return privateJson({ error: "NOT_FOUND" }, 404);

  const purchaseReady = isAiWorkflowPurchaseReady({
    candidateStatus: candidate.status,
    candidateFileId: candidate.fileId,
    toolFileId: tool.downloadFileId,
    isDownloadPaid: tool.isDownloadPaid,
    downloadPrice: Number(tool.downloadPrice),
    priceDecision: candidate.priceDecision,
    confirmedPrice: Number(candidate.confirmedPrice ?? 0),
  });
  if (!purchaseReady || tool.priceSpecs.some((spec) => spec.status === "active")) return privateJson({ error: "NOT_AVAILABLE" }, 404);

  const runtimeVerified = candidate.verifiedEnvironments.some((value) => resolveAiWorkflowRuntime(value) === input.runtime);
  if (!runtimeVerified) return privateJson({ error: "ENVIRONMENT_NOT_VERIFIED" }, 400);

  let file = tool.downloadFile;
  if (tool.isDownloadPaid && Number(tool.downloadPrice) > 0) {
    if (!viewer) return privateJson({ error: "LOGIN_REQUIRED" }, 401);
    const purchase = await prisma.aiWorkflowVersionPurchase.findFirst({
      where: {
        userId: viewer.id,
        toolId: tool.id,
        order: {
          is: {
            orderStatus: "activated",
            refundRecords: { none: { status: "pending" } },
            OR: [
              { paymentTransaction: { is: null } },
              { paymentTransaction: { is: { refundState: null } } },
              { paymentTransaction: { is: { refundState: "provider_rejected" } } },
            ],
          },
        },
      },
      include: { file: true },
      orderBy: { createdAt: "desc" },
    });
    if (!purchase) return privateJson({ error: "PURCHASE_REQUIRED" }, 403);
    file = purchase.file;
  }

  if (!file?.version || !file.sha256 || !/^[a-f0-9]{40,64}$/i.test(file.version) || !/^[a-f0-9]{64}$/i.test(file.sha256)) {
    return privateJson({ error: "PACKAGE_METADATA_MISSING" }, 503);
  }
  const repository = normalizeGitHubRepositoryUrl(candidate.repositoryUrl);
  if (!repository) return privateJson({ error: "SOURCE_METADATA_INVALID" }, 503);

  try {
    const cosConfig = getAiWorkflowCosConfig();
    if (!cosConfig) return privateJson({ error: "DOWNLOAD_SERVICE_NOT_READY" }, 503);
    const downloadUrl = getAiWorkflowDownloadUrl(file);
    const instruction = buildAiWorkflowInstallInstruction({
      agent: input.agent,
      runtime: input.runtime,
      repositoryUrl: repository.url,
      commitSha: file.version,
      packageVersion: file.version,
      packageSha256: file.sha256,
      downloadUrl,
      locale: input.locale,
    });
    return privateJson({ instruction, expiresInSeconds: cosConfig.signExpiresSeconds, packageVersion: file.version, packageSha256: file.sha256 });
  } catch {
    console.error("AI Workflow install instruction could not be prepared.", { operation: "sign_private_download", bucketConfigured: Boolean(process.env.COS_DOWNLOAD_BUCKET?.trim()) });
    return privateJson({ error: "DOWNLOAD_SERVICE_NOT_READY" }, 503);
  }
}
