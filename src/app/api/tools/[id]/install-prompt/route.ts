import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAiWorkflowPurchaseReady } from "@/lib/ai-workflows/rules";
import { prisma } from "@/lib/db";
import { getPrimaryToolPrice } from "@/lib/tool-price-specs";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: privateHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return jsonError("请求来源无效。", 403);

  const { id } = await params;
  const tool = await prisma.tool.findUnique({
    where: { id },
    select: {
      type: true,
      status: true,
      deliveryMode: true,
      installPrompt: true,
      isDownloadPaid: true,
      downloadPrice: true,
      downloadFileId: true,
      priceSpecs: { where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { price: true, status: true } },
      aiWorkflowCandidate: { select: { status: true, fileId: true, priceDecision: true, confirmedPrice: true } },
    },
  });

  if (!tool || tool.status !== "published" || (tool.type !== "software" && tool.type !== "ai_workflow") || tool.deliveryMode !== "how_to" || !tool.installPrompt?.trim()) {
    return jsonError("当前产品没有可用的安装提示词。", 404);
  }

  const price = getPrimaryToolPrice(tool.priceSpecs, tool.downloadPrice);
  const isPaid = tool.isDownloadPaid && price > 0;
  if (tool.type === "ai_workflow" && isPaid && !isAiWorkflowPurchaseReady({
    candidateStatus: tool.aiWorkflowCandidate?.status ?? "",
    candidateFileId: tool.aiWorkflowCandidate?.fileId ?? null,
    toolFileId: tool.downloadFileId,
    isDownloadPaid: tool.isDownloadPaid,
    downloadPrice: Number(tool.downloadPrice),
    priceDecision: tool.aiWorkflowCandidate?.priceDecision ?? null,
    confirmedPrice: Number(tool.aiWorkflowCandidate?.confirmedPrice ?? 0),
  })) return jsonError("当前产品暂不可用。", 404);

  if (isPaid) {
    const user = await getCurrentUser();
    if (!user) return jsonError("请先登录并完成购买。", 401);

    const hasPurchase = tool.type === "ai_workflow"
      ? Boolean(await prisma.aiWorkflowVersionPurchase.findFirst({
          where: {
            userId: user.id,
            toolId: id,
            order: { is: {
              orderStatus: "activated",
              refundRecords: { none: { status: "pending" } },
              OR: [
                { paymentTransaction: { is: null } },
                { paymentTransaction: { is: { refundState: null } } },
                { paymentTransaction: { is: { refundState: "provider_rejected" } } },
              ],
            } },
          },
          select: { id: true },
        }))
      : Boolean(await prisma.toolPurchase.findUnique({ where: { userId_toolId: { userId: user.id, toolId: id } }, select: { id: true } }));

    if (!hasPurchase) return jsonError("请先完成购买后再获取提示词。", 403);
  }

  return NextResponse.json({ prompt: tool.installPrompt }, { headers: privateHeaders });
}
