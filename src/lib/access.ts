import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { canDownloadPaidTool, canUsePaidOnlineTool, DownloadRateLimitError, getDownloadRateLimitConfig, isDownloadRateLimitExceeded } from "@/lib/access-rules";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";

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

export async function assertDownloadAccess(toolId: string) {
  const { tool, user, ip, userAgent } = await assertBaseToolAccess(toolId);
  if (!tool.downloadFileId || !tool.downloadFile) throw new Error("工具尚未配置下载文件");

  if (tool.isDownloadPaid) {
    const purchase = await prisma.toolPurchase.findUnique({
      where: { userId_toolId: { userId: user.id, toolId: tool.id } }
    });
    if (!canDownloadPaidTool({ isDownloadPaid: tool.isDownloadPaid, hasDownloadPurchase: Boolean(purchase) })) {
      redirect(`${buildCanonicalToolPath(tool, "zh")}?download=pay-required`);
    }
  }

  const rateLimit = getDownloadRateLimitConfig();
  const windowStart = new Date(Date.now() - rateLimit.windowSeconds * 1000);
  const recentDownloads = await prisma.downloadLog.count({
    where: {
      userId: user.id,
      toolId: tool.id,
      createdAt: { gte: windowStart }
    }
  });
  if (isDownloadRateLimitExceeded(recentDownloads, rateLimit.max)) {
    throw new DownloadRateLimitError("下载过于频繁，请稍后再试。");
  }

  await prisma.downloadLog.create({
    data: { userId: user.id, toolId: tool.id, fileId: tool.downloadFileId, ip, userAgent }
  });
  await prisma.tool.update({ where: { id: tool.id }, data: { downloadCount: { increment: 1 } } });
  await prisma.file.update({ where: { id: tool.downloadFileId }, data: { downloadCount: { increment: 1 } } });
  return tool.downloadFile;
}

export async function assertOnlineToolAccess(toolId: string) {
  const { tool, user, ip, userAgent } = await assertBaseToolAccess(toolId);
  const servicePrice = getPrimaryToolPrice(tool.priceSpecs, tool.downloadPrice);
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
