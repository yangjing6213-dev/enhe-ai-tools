"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { parseAccountCredentials } from "@/lib/account-identity";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { createOrderNo } from "@/lib/order";
import {
  assertLoginNotLimited,
  getCurrentUser,
  hashPassword,
  recordLoginAttempt,
  requireAdmin,
  requireUser,
  signInUser,
  signOutUser,
  verifyPassword
} from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import {
  sendAdminLoginSecurityEmail,
  sendNewOrderAdminEmail,
  sendOrderReceiptAdminEmail,
  sendPaymentProofSubmittedAdminEmail,
  sendPaymentReviewAdminEmail,
  sendRefundRequestAdminEmail
} from "@/lib/admin-email-notifications";
import { activateVipForOrder } from "@/lib/membership";
import {
  buildPaymentReviewNotification,
  buildRefundRequestNotification
} from "@/lib/notification-messages";
import { createUserNotification } from "@/lib/notifications";
import {
  canUserCancelOrder,
  canUserRequestRefundForOrder,
  getRefundBenefitUsageScopes,
  hasExistingRefundAttempt,
  normalizeRefundRecordAmount
} from "@/lib/order-rules";
import { validatePasswordChangeInput } from "@/lib/password";
import { getCurrentLocale } from "@/lib/i18n";
import { buildCanonicalToolPath } from "@/lib/public-slugs";
import { buildLocalePath } from "@/lib/seo";
import { resolveToolOrderPriceSpec } from "@/lib/tool-price-specs";
import { resolveSafeReturnPath } from "@/lib/safe-return-path";

export async function registerAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const defaultReturnTo = buildLocalePath("/user", locale);
  const returnTo = resolveSafeReturnPath(formData.get("returnTo"), defaultReturnTo);
  await assertValidCsrfToken(formData.get("csrfToken"));
  const input = parseAccountCredentials({
    identifier: formData.get("email"),
    password: formData.get("password")
  });
  const exists = await prisma.user.findUnique({ where: { email: input.identifier } });
  if (exists) {
    const params = new URLSearchParams({ message: "account-exists", returnTo });
    redirect(`${buildLocalePath("/login", locale)}?${params.toString()}`);
  }

  const user = await prisma.user.create({
    data: {
      email: input.identifier,
      passwordHash: await hashPassword(input.password),
      nickname: input.identifier.split("@")[0]
    }
  });
  await signInUser(user.id);
  redirect(returnTo);
}

export async function loginAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const defaultReturnTo = buildLocalePath("/user", locale);
  const returnTo = resolveSafeReturnPath(formData.get("returnTo"), defaultReturnTo);
  await assertValidCsrfToken(formData.get("csrfToken"));
  const input = parseAccountCredentials({
    identifier: formData.get("email"),
    password: formData.get("password")
  });
  try {
    await assertLoginNotLimited(input.identifier);
  } catch (e) {
    if (e instanceof Error && e.message === "LOGIN_LIMITED") {
      const params = new URLSearchParams({ message: "login-limited", returnTo });
      redirect(`${buildLocalePath("/login", locale)}?${params.toString()}`);
    }
    throw e;
  }
  const user = await prisma.user.findUnique({ where: { email: input.identifier } });
  if (!user || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
    await recordLoginAttempt(input.identifier, false);
    const params = new URLSearchParams({ message: "invalid", returnTo });
    redirect(`${buildLocalePath("/login", locale)}?${params.toString()}`);
  }
  await recordLoginAttempt(input.identifier, true);
  await signInUser(user.id);
  if (user.role === "admin") {
    const requestInfo = await getRequestSecurityInfo();
    await sendAdminLoginSecurityEmail({
      userId: user.id,
      adminLabel: user.email ?? user.nickname ?? user.id,
      ip: requestInfo.ip,
      userAgent: requestInfo.userAgent
    });
  }
  redirect(user.role === "admin" ? "/admin" : returnTo);
}

export async function logoutAction() {
  const locale = await getCurrentLocale();
  await signOutUser();
  redirect(buildLocalePath("/", locale));
}

export async function changePasswordAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const validation = validatePasswordChangeInput(currentPassword, newPassword, confirmPassword);

  if (!validation.ok) {
    redirect(`${buildLocalePath("/user", locale)}?password=${encodeURIComponent(validation.message)}`);
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !(await verifyPassword(currentPassword, dbUser.passwordHash))) {
    redirect(`${buildLocalePath("/user", locale)}?password=${encodeURIComponent("当前密码不正确")}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) }
  });

  redirect(`${buildLocalePath("/user", locale)}?password=changed`);
}

export async function updateNewsletterSettingsAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const newsletterEmail = String(formData.get("newsletterEmail") ?? "").trim() || null;
  const acceptEmailUpdates = formData.get("acceptEmailUpdates") === "true" || !!newsletterEmail;
  await prisma.user.update({
    where: { id: user.id },
    data: { newsletterEmail, acceptEmailUpdates }
  });
  revalidatePath(buildLocalePath("/user", locale));
  redirect(`${buildLocalePath("/user", locale)}?settings=saved`);
}

export async function createSoftwareDownloadOrderAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const toolId = z.string().min(1).parse(formData.get("toolId"));
  const requestedPriceSpecId = String(formData.get("priceSpecId") ?? "").trim() || null;
  const paymentMethod = z.enum(["alipay", "wechat"]).parse(formData.get("paymentMethod") ?? "alipay");
  const tool = await prisma.tool.findFirst({
    where: { id: toolId, type: { in: ["software", "online", "skill_learning"] }, status: "published" },
    include: { priceSpecs: { where: { status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
  });
  if (!tool) throw new Error("工具或服务不存在，或尚未发布");
  const selectedPriceSpec = resolveToolOrderPriceSpec(tool.priceSpecs, requestedPriceSpecId);
  const fallbackOrderAmount = tool.type === "software" ? tool.downloadPrice : 0;
  const orderAmount = selectedPriceSpec?.price ?? fallbackOrderAmount;
  const redirectTarget = `/api/tools/${tool.id}/download`;
  const isPaidSoftware = tool.type === "software" && tool.isDownloadPaid && Number(orderAmount) > 0;
  const isPaidAccountService = tool.type === "online" && Number(orderAmount) > 0;
  const isPaidCourse = tool.type === "skill_learning" && Number(orderAmount) > 0;
  if (!isPaidSoftware && !isPaidAccountService && !isPaidCourse) {
    redirect(redirectTarget);
  }

  const existingPurchase = await prisma.toolPurchase.findUnique({
    where: { userId_toolId: { userId: user.id, toolId: tool.id } }
  });
  if (existingPurchase) redirect(redirectTarget);

  const order = await prisma.order.create({
    data: {
      orderNo: createOrderNo(),
      userId: user.id,
      toolId: tool.id,
      toolPriceSpecId: selectedPriceSpec?.id ?? null,
      toolPriceSpecName: selectedPriceSpec?.name ?? null,
      orderType: "software_download",
      amount: orderAmount,
      paymentMethod,
      orderStatus: "pending_payment"
    }
  });
  await trackAnalyticsEvent({
    eventName: "create_order",
    path: buildCanonicalToolPath(tool, locale),
    entityType: "order",
    entityId: order.id,
    userId: user.id,
    metadata: {
      orderType: "software_download",
      toolType: tool.type,
      toolId: tool.id,
      priceSpecId: selectedPriceSpec?.id ?? null,
      priceSpecName: selectedPriceSpec?.name ?? null,
      amount: orderAmount.toString()
    }
  });
  await sendUserFlowAdminEmail(() => sendNewOrderAdminEmail(order.id), "order_created");
  redirect(`/orders/${order.id}/pay`);
}

export async function submitPaymentProofAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const orderId = z.string().min(1).parse(formData.get("orderId"));
  const paymentMethod = z.enum(["alipay", "wechat"]).parse(formData.get("paymentMethod"));
  const proofImage = z.string().min(1, "请填写付款截图地址").parse(formData.get("proofImage"));
  const paymentRemark = z.string().optional().parse(formData.get("paymentRemark") ?? undefined);

  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) throw new Error("订单不存在");

  await prisma.paymentProof.upsert({
    where: { orderId },
    update: { paymentMethod, paymentRemark, proofImage, reviewStatus: "pending" },
    create: { orderId, userId: user.id, paymentMethod, paymentRemark, proofImage, reviewStatus: "pending" }
  });
  await prisma.order.update({ where: { id: orderId }, data: { orderStatus: "pending_review", paymentMethod } });
  await trackAnalyticsEvent({
    eventName: "payment_proof_submitted",
    path: `/orders/${orderId}/pay`,
    entityType: "order",
    entityId: orderId,
    userId: user.id,
    metadata: { paymentMethod }
  });
  await sendPaymentProofSubmittedAdminEmail(orderId);
  redirect(`${buildLocalePath("/user", locale)}?tab=orders`);
}

export async function cancelOrderAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const orderId = z.string().min(1).parse(formData.get("orderId"));
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) throw new Error("订单不存在。");
  if (!canUserCancelOrder(order.orderStatus)) {
    throw new Error("当前订单状态不允许取消。");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: "cancelled" }
  });

  revalidatePath(buildLocalePath("/user", locale));
  redirect(`${buildLocalePath("/user", locale)}?order=cancelled`);
}

export async function createRefundRequestAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const orderId = z.string().min(1).parse(formData.get("orderId"));
  const reason = z.string().min(2, "请填写售后/退款原因").max(500).parse(formData.get("reason"));
  const note = z.string().max(1000).optional().parse(String(formData.get("note") ?? "") || undefined);
  const refundReceiverQr = z.string().min(1, "请填写或粘贴退款收款码图片地址。").max(1000).parse(formData.get("refundReceiverQr"));
  const order = await prisma.$transaction(async (tx) => {
    const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM orders
      WHERE id = ${orderId}
        AND user_id = ${user.id}
      FOR UPDATE
    `);
    if (lockedOrders.length !== 1) throw new Error("订单不存在。");

    const currentOrder = await tx.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: {
        refundRecords: { select: { id: true }, take: 1 },
        paymentTransaction: { select: { refundRecordId: true, refundState: true } },
      }
    });
    if (!currentOrder) throw new Error("订单不存在。");

    const benefitStart = currentOrder.activatedAt ?? currentOrder.paidAt ?? currentOrder.createdAt;
    const benefitUsageScopes = getRefundBenefitUsageScopes({
      orderType: currentOrder.orderType,
      orderId: currentOrder.id,
      userId: user.id,
      toolId: currentOrder.toolId,
      benefitStart
    });
    if (!benefitUsageScopes.isVerifiable) {
      throw new Error("ORDER_ENTITLEMENT_SCOPE_INVALID");
    }
    let downloadCount = 0;
    let usageCount = 0;
    let seoAuditRunCount = 0;
    if (benefitUsageScopes.downloadLog) {
      downloadCount = await tx.downloadLog.count({
        where: benefitUsageScopes.downloadLog
      });
    }
    if (benefitUsageScopes.toolUsageLog) {
      usageCount = await tx.toolUsageLog.count({
        where: benefitUsageScopes.toolUsageLog
      });
    }
    if (benefitUsageScopes.seoAuditRun) {
      seoAuditRunCount = await tx.seoAuditRun.count({
        where: benefitUsageScopes.seoAuditRun
      });
    }

    const hasUsedBenefits = downloadCount > 0 || usageCount > 0 || seoAuditRunCount > 0;
    const hasExistingRefund = hasExistingRefundAttempt({
      refundRecordCount: currentOrder.refundRecords.length,
      paymentRefundRecordId: currentOrder.paymentTransaction?.refundRecordId,
      paymentRefundState: currentOrder.paymentTransaction?.refundState
    });
    if (!canUserRequestRefundForOrder(currentOrder.orderStatus, hasExistingRefund, hasUsedBenefits)) {
      throw new Error("当前订单状态不允许申请售后/退款，或已经提交过申请。");
    }

    const amount = normalizeRefundRecordAmount(
      currentOrder.amount.toString(),
      Number(currentOrder.amount),
    );
    await tx.orderRefundRecord.create({
      data: {
        orderId: currentOrder.id,
        requesterId: user.id,
        amount,
        status: "pending",
        reason,
        note,
        refundReceiverQr
      }
    });
    return { id: currentOrder.id, orderNo: currentOrder.orderNo };
  });
  await trackAnalyticsEvent({
    eventName: "refund_request_submitted",
    path: `/orders/${order.id}`,
    entityType: "order",
    entityId: order.id,
    userId: user.id,
    metadata: { reason }
  });
  await createUserNotification(
    user.id,
    buildRefundRequestNotification({ orderId: order.id, orderNo: order.orderNo })
  );
  await sendRefundRequestAdminEmail(order.id, { reason, note });

  revalidatePath(`/orders/${order.id}`);
  revalidatePath(buildLocalePath("/user", locale));
  redirect(`/orders/${order.id}?refund=requested`);
}

export async function submitOrderReceiptAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const orderId = z.string().min(1).parse(formData.get("orderId"));
  const receipt = String(formData.get("receipt") ?? "");
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true }
  });
  if (!order) throw new Error("订单不存在。");

  await sendUserFlowAdminEmail(() => sendOrderReceiptAdminEmail(order.id, {
    receipt,
    actorLabel: user.email ?? user.nickname ?? user.id
  }), "order_receipt_submitted");
  await trackAnalyticsEvent({
    eventName: "order_receipt_submitted",
    path: `/orders/${order.id}`,
    entityType: "order",
    entityId: order.id,
    userId: user.id,
    metadata: { receiptLength: receipt.length }
  });

  revalidatePath(`/orders/${order.id}`);
  redirect(`/orders/${order.id}?receipt=sent`);
}

export async function markNotificationReadAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const id = z.string().min(1).parse(formData.get("id"));
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() }
  });
  revalidatePath(buildLocalePath("/user", locale));
}

export async function markAllNotificationsReadAction(_formData?: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() }
  });
  revalidatePath(buildLocalePath("/user", locale));
}

export async function createCommentAction(formData: FormData) {
  const locale = await getCurrentLocale();
  const user = await requireUser();
  const toolId = z.string().min(1).parse(formData.get("toolId"));
  const content = z.string().min(2).max(1000).parse(formData.get("content"));
  await prisma.comment.create({ data: { userId: user.id, toolId, content, status: "pending" } });
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    select: { slug: true, name: true, englishName: true, type: true }
  });
  if (tool) {
    revalidatePath(buildCanonicalToolPath(tool, locale));
  }
}

export async function reviewPaymentProofAction(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = z.string().min(1).parse(formData.get("orderId"));
  const decision = z.enum(["approved", "rejected"]).parse(formData.get("decision"));
  const reviewNote = z.string().optional().parse(formData.get("reviewNote") ?? undefined);
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true, orderNo: true } });
  const proof = await prisma.paymentProof.findUnique({ where: { orderId }, select: { id: true } });
  if (!proof) throw new Error("付款记录不存在。");
  if (!order) throw new Error("订单不存在。");

  if (decision === "approved") {
    await activateVipForOrder(orderId, admin.id, reviewNote);
  } else {
    await prisma.$transaction([
      prisma.paymentProof.update({ where: { orderId }, data: { reviewStatus: "rejected", reviewerId: admin.id, reviewedAt: new Date(), reviewNote } }),
      prisma.order.update({ where: { id: orderId }, data: { orderStatus: "rejected" } })
    ]);
  }
  await createUserNotification(
    order.userId,
    buildPaymentReviewNotification({ orderId: order.id, orderNo: order.orderNo, decision, reviewNote })
  );
  await sendPaymentReviewAdminEmail(order.id, {
    decision,
    actorLabel: admin.email ?? admin.nickname ?? admin.id,
    note: reviewNote
  });
  await trackAnalyticsEvent({
    eventName: decision === "approved" ? "payment_review_approved" : "payment_review_rejected",
    path: `/admin/payments/${proof.id}`,
    entityType: "order",
    entityId: orderId,
    userId: order.userId,
    metadata: { decision, adminId: admin.id }
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "payment.review",
    targetType: "order",
    targetId: orderId,
    summary: "Reviewed payment proof.",
    metadata: { decision, reviewNote }
  });
  revalidatePath("/admin/payments");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
  redirect(`/admin/payments/${proof.id}?review=${decision}`);
}

export async function updateCommentStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));
  const status = z.enum(["approved", "rejected", "deleted"]).parse(formData.get("status"));
  await prisma.comment.update({ where: { id }, data: { status } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "comment.status.update",
    targetType: "comment",
    targetId: id,
    summary: "Updated comment review status.",
    metadata: { status }
  });
  revalidatePath("/admin/comments");
}

export async function updateCommentPinAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));
  const isPinned = String(formData.get("isPinned")) === "true";
  const comment = await prisma.comment.update({ where: { id }, data: { isPinned }, include: { tool: true } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "comment.pin.update",
    targetType: "comment",
    targetId: id,
    summary: "Updated comment pin state.",
    metadata: { isPinned, toolId: comment.toolId }
  });
  revalidatePath("/admin/comments");
  revalidatePath(buildCanonicalToolPath(comment.tool, "zh"));
}

export async function getSessionSnapshot() {
  const user = await getCurrentUser();
  return user;
}

async function getRequestSecurityInfo() {
  const headerStore = await headers();
  return {
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent")
  };
}

async function sendUserFlowAdminEmail(send: () => Promise<void>, eventLabel: string) {
  const waitMs = parsePositiveInteger(process.env.ADMIN_EMAIL_ACTION_WAIT_MS, 1500);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const sendPromise = send().catch((error) => {
    console.error(`[admin-email] ${eventLabel} failed during user flow`, error);
  });
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeout = setTimeout(() => resolve("timeout"), waitMs);
  });
  const result = await Promise.race([sendPromise.then(() => "sent" as const), timeoutPromise]);
  if (timeout) clearTimeout(timeout);
  if (result === "timeout") {
    console.warn(`[admin-email] ${eventLabel} did not finish within ${waitMs}ms; continuing user flow`);
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
