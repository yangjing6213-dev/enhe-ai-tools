import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { canDownloadPaidTool, canUsePaidOnlineTool, DownloadRateLimitError, getDownloadRateLimitConfig, isDownloadRateLimitExceeded } from "@/lib/access-rules";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";
import { isAiWorkflowPurchaseReady } from "@/lib/ai-workflows/rules";

async function assertBaseToolAccess(toolId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { downloadFile: true, priceSpecs: { where: { status: "active" } } }
  });
  if (!tool || tool.status !== "published") throw new Error("工具不存在或未发布");

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0] ?? null;
  const userAgent = headerStore.get("user-agent");

  return { tool, user, ip, userAgent };
}

export async function assertDownloadAccess(toolId: string, anonymousVisitorKey?: string) {
  const user = await getCurrentUser();
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { downloadFile: true, priceSpecs: { where: { status: "active" } }, aiWorkflowCandidate: true }
  });
  if (!tool || tool.status !== "published") throw new Error("工具不存在或未发布");
  const isAiWorkflow = tool.type === "ai_workflow";
  if (isAiWorkflow && (tool.priceSpecs.length > 0 || !isAiWorkflowPurchaseReady({
    candidateStatus: tool.aiWorkflowCandidate?.status ?? "",
    candidateFileId: tool.aiWorkflowCandidate?.fileId ?? null,
    toolFileId: tool.downloadFileId,
    isDownloadPaid: tool.isDownloadPaid,
    downloadPrice: Number(tool.downloadPrice),
    priceDecision: tool.aiWorkflowCandidate?.priceDecision ?? null,
    confirmedPrice: Number(tool.aiWorkflowCandidate?.confirmedPrice ?? 0),
  }))) throw new Error("AI 工作流尚未完成价格确认或交付版本归档");
  const downloadPrice = isAiWorkflow ? Number(tool.downloadPrice) : getPrimaryToolPrice(tool.priceSpecs, tool.downloadPrice);
  const isPaid = tool.isDownloadPaid && downloadPrice > 0;
  const countedOnPayment = isPaid || ((tool.type === "online" || tool.type === "skill_learning") && downloadPrice > 0);
  if (!user && !(isAiWorkflow && !isPaid)) redirect("/login");

  const headerStore = await headers();
  const ip = headerStore.get("x-real-ip")?.trim() || null;
  const userAgent = headerStore.get("user-agent");
  let file = tool.downloadFile;

  if (isPaid) {
    if (!user) redirect(`${buildCanonicalToolPath(tool, "zh")}?download=pay-required`);
    if (isAiWorkflow) {
      const entitlement = await prisma.aiWorkflowVersionPurchase.findFirst({
        where: {
          userId: user.id,
          toolId: tool.id,
          order: {
            is: {
              orderStatus: "activated",
              refundRecords: { none: { status: "pending" } },
              OR: [
                { paymentTransaction: { is: null } },
                { paymentTransaction: { is: { refundState: null } } },
                { paymentTransaction: { is: { refundState: "provider_rejected" } } }
              ]
            }
          }
        },
        include: { file: true },
        orderBy: { createdAt: "desc" }
      });
      if (!entitlement) redirect(`${buildCanonicalToolPath(tool, "zh")}?download=pay-required`);
      file = entitlement.file;
    } else {
      const purchase = await prisma.toolPurchase.findUnique({
        where: { userId_toolId: { userId: user.id, toolId: tool.id } }
      });
      if (!canDownloadPaidTool({ isDownloadPaid: tool.isDownloadPaid, downloadPrice, hasDownloadPurchase: Boolean(purchase) })) {
        redirect(`${buildCanonicalToolPath(tool, "zh")}?download=pay-required`);
      }
    }
  }
  if (!file) throw new Error("工具尚未配置下载文件");

  const rateLimit = getDownloadRateLimitConfig();
  const windowStart = new Date(Date.now() - rateLimit.windowSeconds * 1000);
  if (user) {
    const recentDownloads = await prisma.downloadLog.count({
      where: { userId: user.id, toolId: tool.id, createdAt: { gte: windowStart } }
    });
    if (isDownloadRateLimitExceeded(recentDownloads, rateLimit.max)) {
      throw new DownloadRateLimitError("下载过于频繁，请稍后再试。");
    }
  }

  if (isAiWorkflow) {
    const identity = user ? `user:${user.id}` : anonymousVisitorKey ? `visitor:${anonymousVisitorKey}` : null;
    if (!identity) throw new Error("免费工作流下载需要浏览器访问标识。");
    const visitorKey = createHash("sha256").update(identity).digest("hex");
    await prisma.$transaction(async (tx) => {
      const event = await tx.aiWorkflowDownloadEvent.createMany({
        data: [{ userId: user?.id ?? null, toolId: tool.id, fileId: file.id, visitorKey }],
        skipDuplicates: true
      });
      if (event.count === 1) {
        if (!countedOnPayment) await tx.tool.update({ where: { id: tool.id }, data: { downloadCount: { increment: 1 } } });
        await tx.file.update({ where: { id: file.id }, data: { downloadCount: { increment: 1 } } });
      }
      if (user) {
        await tx.downloadLog.create({ data: { userId: user.id, toolId: tool.id, fileId: file.id, ip, userAgent } });
      }
    });
    return file;
  }

  if (!user) redirect("/login");
  await prisma.downloadLog.create({ data: { userId: user.id, toolId: tool.id, fileId: file.id, ip, userAgent } });
  if (!countedOnPayment) await prisma.tool.update({ where: { id: tool.id }, data: { downloadCount: { increment: 1 } } });
  await prisma.file.update({ where: { id: file.id }, data: { downloadCount: { increment: 1 } } });
  return file;
}

export async function assertOnlineToolAccess(toolId: string) {
  const { tool, user, ip, userAgent } = await assertBaseToolAccess(toolId);
  const servicePrice = getPrimaryToolPrice(tool.priceSpecs, 0);
  if (tool.type === "online" && servicePrice > 0) {
    const purchase = await prisma.toolPurchase.findUnique({
      where: { userId_toolId: { userId: user.id, toolId: tool.id } }
    });
    if (!canUsePaidOnlineTool({ servicePrice, hasToolPurchase: Boolean(purchase) })) {
      redirect(`${buildCanonicalToolPath(tool, "zh")}?service=pay-required`);
    }
  }
  await prisma.toolUsageLog.create({ data: { userId: user.id, toolId: tool.id, ip, userAgent } });
  await prisma.tool.update({ where: { id: tool.id }, data: { usageCount: { increment: 1 } } });
  return tool;
}
