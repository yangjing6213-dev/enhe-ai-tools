import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveFormRedirectUrlFromRequest } from "@/lib/redirect-url";
import { saveUploadedFile } from "@/lib/storage";

const maxProofBytes = 8 * 1024 * 1024;

function redirectToPay(request: Request, orderId: string, params: Record<string, string>) {
  const url = resolveFormRedirectUrlFromRequest(`/orders/${orderId}/pay`, request);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 303);
}

function redirectToOrder(request: Request, orderId: string, params: Record<string, string>) {
  const url = resolveFormRedirectUrlFromRequest(`/orders/${orderId}`, request);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const orderId = String(formData.get("orderId") ?? "");
  const paymentMethodResult = z.enum(["alipay", "wechat"]).safeParse(formData.get("paymentMethod"));
  const paymentRemark = String(formData.get("paymentRemark") ?? "");
  const file = formData.get("file");

  if (!orderId) {
    return NextResponse.json({ message: "缺少订单信息。" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) {
    return redirectToPay(request, orderId, { error: "订单不存在或无权上传付款截图。" });
  }

  if (!["pending_payment", "pending_review", "rejected"].includes(order.orderStatus)) {
    return redirectToPay(request, orderId, { error: "当前订单状态不允许重新提交付款截图。" });
  }

  if (!paymentMethodResult.success) {
    return redirectToPay(request, orderId, { error: "请选择正确的付款方式。" });
  }

  if (!(file instanceof File)) {
    return redirectToPay(request, orderId, { error: "请选择付款截图。" });
  }

  if (!file.type.startsWith("image/")) {
    return redirectToPay(request, orderId, { error: "付款凭证必须是图片。" });
  }

  if (file.size > maxProofBytes) {
    return redirectToPay(request, orderId, { error: "图片超过 8MB，请压缩后重新上传。" });
  }

  const stored = await saveUploadedFile(file, {
    folder: "payment-proofs",
    maxBytes: maxProofBytes,
    accept: (value) => value.type.startsWith("image/"),
    invalidTypeMessage: "付款凭证必须是图片。"
  });

  await prisma.$transaction([
    prisma.paymentProof.upsert({
      where: { orderId },
      update: {
        paymentMethod: paymentMethodResult.data,
        paymentRemark,
        proofImage: stored.storage === "cos" ? stored.filePath : stored.fileUrl,
        reviewStatus: "pending",
        reviewerId: null,
        reviewedAt: null,
        reviewNote: null
      },
      create: {
        orderId,
        userId: user.id,
        paymentMethod: paymentMethodResult.data,
        paymentRemark,
        proofImage: stored.storage === "cos" ? stored.filePath : stored.fileUrl,
        reviewStatus: "pending"
      }
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: "pending_review", paymentMethod: paymentMethodResult.data }
    })
  ]);

  return redirectToOrder(request, orderId, { uploaded: "1" });
}
