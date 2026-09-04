"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma, Order, PaymentTransaction } from "@prisma/client";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { prisma } from "@/lib/db";
import {
  buildSeoFriendlySlug,
  parseBooleanField,
  parseNumberField,
  parseOptionalString,
  buildPublicUploadUrl,
  resolveToolSlug
} from "@/lib/admin-form";
import { parseNewsRelationIds, resolveAiNewsCanonicalSlug, resolveNewsSlug } from "@/lib/ai-news";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { getOrderTimestampPatch } from "@/lib/admin-order";
import { sendRefundProcessedAdminEmail } from "@/lib/admin-email-notifications";
import { getAdminUserDeleteBlockReason } from "@/lib/admin-user-rules";
import { getAdminToolBasePath, getAdminToolEditPath } from "@/lib/admin-tool-routes";
import { buildAiNewsImportPayloadFromHtml } from "@/lib/ai-news-html-import";
import { importAiNewsArticle } from "@/lib/ai-news-import";
import { notifyBaiduSearch } from "@/lib/baidu-push";
import { notifyIndexNow } from "@/lib/indexnow";
import { revokeEntitlementsForRefundedOrder } from "@/lib/membership";
import { createLicenseCode, isUnlimitedLicenseKeyValid, parseLicenseCode } from "@/lib/license-generator";
import type { LicenseGeneratorActionState } from "@/lib/license-generator-action-state";
import { isLikelyUploadableImage } from "@/lib/media";
import { buildRefundProcessedNotification } from "@/lib/notification-messages";
import { createUserNotification } from "@/lib/notifications";
import {
  assertAdminOrderStatusUpdateAllowed,
  canAdminDeleteOrderSafely,
  canRecordRefundForOrder,
  getRefundStatusPatch,
  isAdminDeleteRiskConfirmed,
  normalizeRefundRecordAmount
} from "@/lib/order-rules";
import {
  deleteStoredCosObjectIfConfigured,
  deleteStoredLocalFileIfSafe,
  derivePublicUploadUrlFromFilePath,
  parseCosFilePath,
  saveUploadedFile
} from "@/lib/storage";
import { normalizeToolContentForStorage, normalizeToolSummaryForStorage, parseTagNames, tagSlug } from "@/lib/tool-content";
import { canOpenProtectedDownloadEntry } from "@/lib/tool-download-link";
import { getPrimaryToolPriceSpec, parseToolPriceSpecsFromFormData, type ToolPriceSpecDraft } from "@/lib/tool-price-specs";
import { mergeToolProductImages } from "@/lib/tool-product-images";
import { buildCanonicalAiNewsPath, buildCanonicalToolPath } from "@/lib/public-slugs";
import { getUploadDiskPath } from "@/lib/upload-path";
import { adminFileUploadMaxBytes } from "@/lib/upload-limits";
import { refundZpayTransactionForOrder } from "@/lib/zpay-orders";
import { generateAiNewsEnglishDraft } from "@/lib/ai-news-translation";
import type { AiNewsTranslationActionState } from "@/app/admin/ai-news-translation-panel";

const idSchema = z.string().min(1);
const maxCoverImageBytes = 8 * 1024 * 1024;
const maxPaymentQrImageBytes = 8 * 1024 * 1024;
const deleteUserConfirmationToken = "DELETE_USER";

async function writeAdminAuditLogBestEffort(input: Parameters<typeof writeAdminAuditLog>[0]) {
  try {
    await writeAdminAuditLog(input);
  } catch (error) {
    console.error("[admin-audit] failed to write audit log", error);
  }
}

function toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function requestZpayRefundBeforeCompletion(input: {
  order: Pick<Order, "orderNo" | "amount"> & { paymentTransaction?: PaymentTransaction | null };
  redirectPath: string;
}) {
  try {
    const result = await refundZpayTransactionForOrder({ order: input.order });
    return result.response ? (result.response as Record<string, unknown>) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "ZPAY 退款接口调用失败。";
    redirect(`${input.redirectPath}?error=${encodeURIComponent(message)}`);
  }
}

async function markZpayTransactionRefunded(
  tx: Prisma.TransactionClient,
  orderId: string,
  payload: Record<string, unknown> | null
) {
  if (!payload) return;
  await tx.paymentTransaction.updateMany({
    where: { orderId, provider: "zpay" },
    data: {
      status: "refunded",
      refundedAt: new Date(),
      refundPayload: toPrismaJson(payload)
    }
  });
}

async function syncToolPriceSpecs(toolId: string, specs: ToolPriceSpecDraft[]) {
  const incomingIds = specs.map((spec) => spec.id).filter((id): id is string => Boolean(id));
  await prisma.toolPriceSpec.updateMany({
    where: {
      toolId,
      ...(incomingIds.length ? { id: { notIn: incomingIds } } : {})
    },
    data: { status: "disabled" }
  });

  for (const spec of specs) {
    if (spec.id) {
      await prisma.toolPriceSpec.updateMany({
        where: { id: spec.id, toolId },
        data: {
          name: spec.name,
          price: spec.price,
          sortOrder: spec.sortOrder,
          status: spec.status
        }
      });
      continue;
    }

    await prisma.toolPriceSpec.create({
      data: {
        toolId,
        name: spec.name,
        price: spec.price,
        sortOrder: spec.sortOrder,
        status: spec.status
      }
    });
  }
}

function normalizeUploadActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "上传失败，请稍后重试。";
  const trimmed = message.trim();
  if (!trimmed) return "上传失败，请稍后重试。";
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}...` : trimmed;
}

async function saveAdminImageUpload(file: FormDataEntryValue | null, prefix: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!isLikelyUploadableImage(file)) throw new Error("请上传图片格式的封面图。");
  if (file.size > maxCoverImageBytes) throw new Error("封面图不能超过 8MB。");

  const publicUrl = buildPublicUploadUrl(`${prefix}-${file.name}`);
  const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
  const diskPath = getUploadDiskPath(publicUrl, process.cwd(), process.env.UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
  return publicUrl;
}

async function saveAdminImageUploads(files: FormDataEntryValue[], prefix: string) {
  const uploadedImages: string[] = [];
  for (const file of files) {
    const uploaded = await saveAdminImageUpload(file, prefix);
    if (uploaded) uploadedImages.push(uploaded);
  }
  return uploadedImages;
}

async function resolvePaymentQrCodeInput(urlValue: FormDataEntryValue | null, fileValue: FormDataEntryValue | null, method: "alipay" | "wechat") {
  if (fileValue instanceof File && fileValue.size > 0) {
    const stored = await saveUploadedFile(fileValue, {
      folder: `payment-qr/${method}`,
      maxBytes: maxPaymentQrImageBytes,
      accept: isLikelyUploadableImage,
      invalidTypeMessage: "请上传 JPG、PNG、WebP、GIF 或 SVG 图片格式的收款码。"
    });
    return stored.fileUrl;
  }

  return parseOptionalString(urlValue) ?? "";
}

function parseDownloadFileUrl(value: FormDataEntryValue | null) {
  return parseOptionalString(value);
}

function getToolListingPath(type: "software" | "online" | "skill_learning") {
  if (type === "skill_learning") return "/skill-learning";
  if (type === "software") return "/software";
  return "/account-services";
}

function deriveDownloadFileName(downloadUrl: string, fallbackName: string) {
  if (!canOpenProtectedDownloadEntry(downloadUrl)) return `${fallbackName} 下载链接`;
  const pathPart = downloadUrl.split("?")[0]?.split("#")[0] ?? "";
  const lastSegment = pathPart.split("/").filter(Boolean).pop();
  if (!lastSegment) return fallbackName;
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
}

async function upsertDirectDownloadFileForTool({
  toolId,
  currentFileId,
  toolName,
  version,
  downloadFileUrl
}: {
  toolId: string;
  currentFileId: string | null;
  toolName: string;
  version: string | null;
  downloadFileUrl: string;
}) {
  const fileName = deriveDownloadFileName(downloadFileUrl, toolName);
  const fileData = {
    toolId,
    fileName,
    filePath: downloadFileUrl,
    fileUrl: downloadFileUrl,
    version,
    mimeType: null,
    fileSize: null
  };
  const currentFile = currentFileId
    ? await prisma.file.findUnique({
        where: { id: currentFileId },
        select: { id: true, toolId: true, filePath: true, fileUrl: true }
      })
    : null;

  if (currentFile?.toolId === toolId && currentFile.filePath === currentFile.fileUrl) {
    const updated = await prisma.file.update({
      where: { id: currentFile.id },
      data: fileData,
      select: { id: true }
    });
    return updated.id;
  }

  const existingDirectFile = await prisma.file.findFirst({
    where: { toolId, filePath: downloadFileUrl, fileUrl: downloadFileUrl },
    select: { id: true }
  });
  if (existingDirectFile) {
    await prisma.file.update({ where: { id: existingDirectFile.id }, data: fileData });
    return existingDirectFile.id;
  }

  const created = await prisma.file.create({
    data: fileData,
    select: { id: true }
  });
  return created.id;
}

export async function generateLicenseCodeAdminAction(
  _prevState: LicenseGeneratorActionState,
  formData: FormData
): Promise<LicenseGeneratorActionState> {
  const admin = await requireAdmin();
  const licenseType = z.enum(["single", "unlimited"]).parse(formData.get("licenseType"));
  const machineId = parseOptionalString(formData.get("machineId"));
  const note = parseOptionalString(formData.get("note")) ?? "";
  const adminKey = parseOptionalString(formData.get("adminKey"));

  if (licenseType === "unlimited" && !isUnlimitedLicenseKeyValid(adminKey)) {
    return {
      ok: false,
      message: "请先输入正确密钥解锁无限授权码。",
      code: ""
    };
  }

  try {
    const code = createLicenseCode({ licenseType, machineId, note });
    const parsed = parseLicenseCode(code);
    await writeAdminAuditLog({
      adminId: admin.id,
      action: "license.generate",
      targetType: "license",
      targetId: parsed.payload?.machine_id ?? licenseType,
      summary: licenseType === "single" ? "Generated single-machine license code." : "Generated unlimited license code.",
      metadata: {
        licenseType,
        machineId: parsed.payload?.machine_id ?? null,
        note
      }
    });

    return {
      ok: true,
      message: "授权码生成成功。",
      code,
      payload: parsed.payload
        ? {
            license_type: parsed.payload.license_type,
            machine_id: parsed.payload.machine_id,
            issued_at: parsed.payload.issued_at,
            note: parsed.payload.note
          }
        : undefined
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "授权码生成失败。",
      code: ""
    };
  }
}

export async function updateUserAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const role = z.enum(["user", "admin"]).parse(formData.get("role"));
  const status = z.enum(["active", "disabled"]).parse(formData.get("status"));
  const nickname = parseOptionalString(formData.get("nickname"));

  await prisma.user.update({
    where: { id },
    data: { role, status, nickname }
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "user.update",
    targetType: "user",
    targetId: id,
    summary: "Updated user profile, role, or status.",
    metadata: { role, status, nickname }
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}

export async function resetUserPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const password = z.string().min(8).parse(formData.get("password"));

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) }
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "user.password.reset",
    targetType: "user",
    targetId: id,
    summary: "Reset user password."
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}

export async function deleteUserAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const confirmDelete = parseOptionalString(formData.get("confirmDelete"));
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, phone: true, nickname: true, role: true }
  });
  if (!user) {
    redirect(`/admin/users?error=${encodeURIComponent("用户不存在，可能已经被删除。")}`);
  }
  if (confirmDelete !== deleteUserConfirmationToken) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent("请先勾选删除确认。")}`);
  }

  const remainingAdminCount = await prisma.user.count({
    where: {
      role: "admin",
      id: { not: id }
    }
  });
  const blockReason = getAdminUserDeleteBlockReason({
    currentAdminId: admin.id,
    targetUserId: id,
    targetRole: user.role,
    remainingAdminCount
  });
  if (blockReason) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent(blockReason)}`);
  }

  const cleanup = await prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({ where: { userId: id }, select: { id: true } });
    const orderIds = orders.map((order) => order.id);

    const adminAuditLogs = await tx.adminAuditLog.updateMany({ where: { adminId: id }, data: { adminId: null } });
    const reviewedProofs = await tx.paymentProof.updateMany({ where: { reviewerId: id }, data: { reviewerId: null } });
    const vipAdjustmentLogs = await tx.vipAdjustmentLog.deleteMany({
      where: { OR: [{ userId: id }, { adminId: id }] }
    });
    const refundRecords = await tx.orderRefundRecord.deleteMany({
      where: { OR: [{ adminId: id }, { requesterId: id }, { orderId: { in: orderIds } }] }
    });
    const paymentProofs = await tx.paymentProof.deleteMany({
      where: { OR: [{ userId: id }, { orderId: { in: orderIds } }] }
    });
    const toolPurchases = await tx.toolPurchase.deleteMany({
      where: { OR: [{ userId: id }, { orderId: { in: orderIds } }] }
    });
    const downloadLogs = await tx.downloadLog.deleteMany({ where: { userId: id } });
    const usageLogs = await tx.toolUsageLog.deleteMany({ where: { userId: id } });
    const comments = await tx.comment.deleteMany({ where: { userId: id } });
    const memberships = await tx.membership.deleteMany({ where: { userId: id } });
    const sessions = await tx.session.deleteMany({ where: { userId: id } });
    const deletedOrders = await tx.order.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });

    return {
      orders: deletedOrders.count,
      paymentProofs: paymentProofs.count,
      toolPurchases: toolPurchases.count,
      comments: comments.count,
      memberships: memberships.count,
      downloadLogs: downloadLogs.count,
      usageLogs: usageLogs.count,
      sessions: sessions.count,
      vipAdjustmentLogs: vipAdjustmentLogs.count,
      refundRecords: refundRecords.count,
      reviewedProofsUnlinked: reviewedProofs.count,
      adminAuditLogsUnlinked: adminAuditLogs.count
    };
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "user.delete",
    targetType: "user",
    targetId: id,
    summary: "Deleted user and cleaned related user-owned records.",
    metadata: {
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      role: user.role,
      cleanup
    }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?deleted=1");
}

export async function updateOrderAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const orderStatus = z
    .enum(["pending_payment", "pending_review", "paid", "activated", "rejected", "cancelled", "refunded"])
    .parse(formData.get("orderStatus"));
  const paymentMethodValue = parseOptionalString(formData.get("paymentMethod"));
  const paymentMethod = paymentMethodValue ? z.enum(["alipay", "wechat"]).parse(paymentMethodValue) : null;
  const amount = parseNumberField(formData.get("amount"), 0);
  const order = await prisma.order.findUnique({ where: { id } });
  if (order) {
    assertAdminOrderStatusUpdateAllowed(orderStatus, order.orderStatus);
  }
  if (!order) throw new Error("订单不存在");

  await prisma.order.update({
    where: { id },
    data: {
      amount,
      paymentMethod,
      orderStatus,
      ...getOrderTimestampPatch(orderStatus, order.paidAt, order.activatedAt)
    }
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "order.update",
    targetType: "order",
    targetId: id,
    summary: "Updated order status, amount, or payment method.",
    metadata: { beforeStatus: order.orderStatus, orderStatus, paymentMethod, amount }
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/payments");
  revalidatePath("/user");
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function deleteOrderAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const confirmRisk = parseOptionalString(formData.get("confirmRisk"));
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    redirect(`/admin/orders?error=${encodeURIComponent("订单不存在，可能已经被删除。")}`);
  }
  if (!canAdminDeleteOrderSafely(order.orderStatus) && !isAdminDeleteRiskConfirmed(confirmRisk)) {
    redirect(`/admin/orders?error=${encodeURIComponent("该订单已支付或已开通权益，请先勾选风险确认后再删除。")}`);
  }

  await prisma.$transaction([
    prisma.paymentProof.deleteMany({ where: { orderId: id } }),
    prisma.toolPurchase.deleteMany({ where: { orderId: id } }),
    prisma.orderRefundRecord.deleteMany({ where: { orderId: id } }),
    prisma.order.delete({ where: { id } })
  ]);
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "order.delete",
    targetType: "order",
    targetId: id,
    summary: "Deleted order after admin confirmation.",
    metadata: { orderNo: order.orderNo, orderStatus: order.orderStatus, confirmedRisk: !canAdminDeleteOrderSafely(order.orderStatus) }
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/user");
  redirect("/admin/orders?deleted=1");
}

export async function createRefundRecordAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = idSchema.parse(formData.get("orderId"));
  const status = z.enum(["pending", "completed", "rejected"]).parse(formData.get("status") ?? "completed");
  const reason = z.string().min(2, "必须填写售后/退款原因").parse(formData.get("reason"));
  const note = parseOptionalString(formData.get("note"));
  const refundReceiverQr = parseOptionalString(formData.get("refundReceiverQr"));
  const refundProofImage = parseOptionalString(formData.get("refundProofImage"));
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { paymentTransaction: true } });
  if (!order) {
    redirect(`/admin/orders?error=${encodeURIComponent("订单不存在，无法记录售后/退款。")}`);
  }
  if (!canRecordRefundForOrder(order.orderStatus)) {
    redirect(`/admin/orders?error=${encodeURIComponent("当前订单状态不允许创建退款记录。")}`);
  }

  let amount: number;
  try {
    amount = normalizeRefundRecordAmount(formData.get("amount"), Number(order.amount));
  } catch (error) {
    const message = error instanceof Error ? error.message : "退款金额无效。";
    redirect(`/admin/orders?error=${encodeURIComponent(message)}`);
  }

  const zpayRefundPayload = status === "completed"
    ? await requestZpayRefundBeforeCompletion({ order, redirectPath: `/admin/orders/${orderId}` })
    : null;

  const refund = await prisma.$transaction(async (tx) => {
    const created = await tx.orderRefundRecord.create({
      data: {
        orderId,
        adminId: admin.id,
        amount,
        status,
        reason,
        note,
        refundReceiverQr,
        refundProofImage: refundProofImage ?? (zpayRefundPayload ? String(zpayRefundPayload.msg ?? "ZPAY refund completed") : null),
        ...getRefundStatusPatch(status, null)
      }
    });

    if (status === "completed") {
      await markZpayTransactionRefunded(tx, orderId, zpayRefundPayload);
      await revokeEntitlementsForRefundedOrder(tx, order);
      await tx.order.update({ where: { id: orderId }, data: { orderStatus: "refunded" } });
    }

    return created;
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "order.refund.create",
    targetType: "order",
    targetId: orderId,
    summary: "Created order after-sales/refund record.",
    metadata: { refundId: refund.id, amount, status, reason, refundReceiverQr, refundProofImage }
  });
  if (status !== "pending") {
    await sendRefundProcessedAdminEmail(orderId, {
      status,
      actorLabel: admin.email ?? admin.nickname ?? admin.id,
      note
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${refund.id}`);
  revalidatePath("/user");
  redirect(`/admin/orders/${orderId}?refund=1`);
}

export async function processRefundRecordAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("refundId"));
  const status = z.enum(["completed", "rejected"]).parse(formData.get("status"));
  const note = parseOptionalString(formData.get("note"));
  const refundProofImage = parseOptionalString(formData.get("refundProofImage"));
  const refund = await prisma.orderRefundRecord.findUnique({
    where: { id },
    include: { order: { include: { paymentTransaction: true } } }
  });
  if (!refund) {
    redirect(`/admin/orders?error=${encodeURIComponent("售后/退款记录不存在。")}`);
  }
  if (refund.status !== "pending") {
    redirect(`/admin/orders?error=${encodeURIComponent("该售后/退款记录已经处理。")}`);
  }

  const zpayRefundPayload = status === "completed"
    ? await requestZpayRefundBeforeCompletion({ order: refund.order, redirectPath: `/admin/refunds/${id}` })
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.orderRefundRecord.update({
      where: { id },
      data: {
        status,
        adminId: admin.id,
        note: note ?? refund.note,
        refundProofImage: refundProofImage ?? refund.refundProofImage ?? (zpayRefundPayload ? String(zpayRefundPayload.msg ?? "ZPAY refund completed") : null),
        ...getRefundStatusPatch(status, refund.completedAt)
      }
    });

    if (status === "completed") {
      await markZpayTransactionRefunded(tx, refund.orderId, zpayRefundPayload);
      await revokeEntitlementsForRefundedOrder(tx, refund.order);
      await tx.order.update({ where: { id: refund.orderId }, data: { orderStatus: "refunded" } });
    }
  });
  await createUserNotification(
    refund.requesterId ?? refund.order.userId,
    buildRefundProcessedNotification({
      orderId: refund.orderId,
      orderNo: refund.order.orderNo,
      status,
      note
    })
  );
  await sendRefundProcessedAdminEmail(refund.orderId, {
    status,
    actorLabel: admin.email ?? admin.nickname ?? admin.id,
    note
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "order.refund.process",
    targetType: "order",
    targetId: refund.orderId,
    summary: "Processed user after-sales/refund request.",
    metadata: { refundId: id, status, note, refundProofImage }
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${refund.orderId}`);
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${id}`);
  revalidatePath(`/orders/${refund.orderId}`);
  revalidatePath("/user");
  redirect(`/admin/refunds/${id}?processed=1`);
}

export async function upsertDevelopmentVersionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const data = {
    version: z.string().min(1).parse(formData.get("version")),
    name: z.string().min(1).parse(formData.get("name")),
    description: parseOptionalString(formData.get("description")),
    status: z.enum(["planned", "active", "released", "archived"]).parse(formData.get("status") ?? "active"),
    startedAt: parseDateField(formData.get("startedAt")),
    releasedAt: parseDateField(formData.get("releasedAt")),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0)
  };

  const version = id
    ? await prisma.developmentVersion.update({ where: { id }, data })
    : await prisma.developmentVersion.create({ data });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "development.version.update" : "development.version.create",
    targetType: "development_version",
    targetId: version.id,
    summary: id ? "Updated development version." : "Created development version.",
    metadata: { version: version.version, status: version.status }
  });

  revalidatePath("/admin/development");
}

export async function deleteDevelopmentVersionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const version = await prisma.developmentVersion.delete({ where: { id } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "development.version.delete",
    targetType: "development_version",
    targetId: id,
    summary: "Deleted development version and its progress items.",
    metadata: { version: version.version, name: version.name }
  });

  revalidatePath("/admin/development");
  redirect("/admin/development?deleted=version");
}

export async function upsertDevelopmentItemAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const data = {
    versionId: idSchema.parse(formData.get("versionId")),
    module: z.string().min(1).parse(formData.get("module")),
    name: z.string().min(1).parse(formData.get("name")),
    status: z.enum(["completed", "partial", "not_started", "recommended"]).parse(formData.get("status") ?? "not_started"),
    priority: z.enum(["high", "medium", "low"]).parse(formData.get("priority") ?? "medium"),
    relatedFiles: parseOptionalString(formData.get("relatedFiles")),
    notes: parseOptionalString(formData.get("notes")),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0)
  };

  const item = id
    ? await prisma.developmentItem.update({ where: { id }, data })
    : await prisma.developmentItem.create({ data });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "development.item.update" : "development.item.create",
    targetType: "development_item",
    targetId: item.id,
    summary: id ? "Updated development progress item." : "Created development progress item.",
    metadata: { module: item.module, name: item.name, status: item.status, priority: item.priority }
  });

  revalidatePath("/admin/development");
}

export async function deleteDevelopmentItemAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const item = await prisma.developmentItem.delete({ where: { id } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "development.item.delete",
    targetType: "development_item",
    targetId: id,
    summary: "Deleted development progress item.",
    metadata: { module: item.module, name: item.name, status: item.status }
  });

  revalidatePath("/admin/development");
  redirect("/admin/development?deleted=item");
}

export async function upsertProductReleaseAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const data = {
    version: z.string().min(1).parse(formData.get("version")),
    name: z.string().min(1).parse(formData.get("name")),
    description: parseOptionalString(formData.get("description")),
    status: z.enum(["planned", "active", "released", "archived"]).parse(formData.get("status") ?? "planned"),
    developmentVersionId: parseOptionalString(formData.get("developmentVersionId")),
    releaseDate: parseDateField(formData.get("releaseDate")),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0)
  };

  const release = id
    ? await prisma.productRelease.update({ where: { id }, data })
    : await prisma.productRelease.create({ data });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "product_release.update" : "product_release.create",
    targetType: "product_release",
    targetId: release.id,
    summary: id ? "Updated product release." : "Created product release.",
    metadata: { version: release.version, status: release.status, developmentVersionId: release.developmentVersionId }
  });

  revalidatePath("/admin/releases");
  revalidatePath("/admin/development");
  redirect("/admin/releases?saved=1");
}

export async function deleteProductReleaseAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const release = await prisma.productRelease.delete({ where: { id } });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "product_release.delete",
    targetType: "product_release",
    targetId: id,
    summary: "Deleted product release.",
    metadata: { version: release.version, name: release.name }
  });

  revalidatePath("/admin/releases");
  revalidatePath("/admin/development");
  redirect("/admin/releases?deleted=1");
}

function parseDateField(value: FormDataEntryValue | null) {
  const text = parseOptionalString(value);
  return text ? new Date(`${text}T00:00:00`) : null;
}

export async function upsertCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const data = {
    name: z.string().min(1).parse(formData.get("name")),
    type: z.enum(["software", "online", "skill_learning"]).parse(formData.get("type")),
    description: parseOptionalString(formData.get("description")),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active")
  };

  let categoryId = id;
  if (id) {
    await prisma.toolCategory.update({ where: { id }, data });
  } else {
    const created = await prisma.toolCategory.create({ data });
    categoryId = created.id;
  }
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "category.update" : "category.create",
    targetType: "tool_category",
    targetId: categoryId,
    summary: id ? "Updated tool category." : "Created tool category.",
    metadata: { name: data.name, type: data.type, status: data.status }
  });
  revalidatePath("/admin/categories");
  revalidatePath("/software");
  revalidatePath("/account-services");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const category = await prisma.toolCategory.delete({ where: { id } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "category.delete",
    targetType: "tool_category",
    targetId: id,
    summary: "Deleted tool category.",
    metadata: { name: category.name, type: category.type }
  });
  revalidatePath("/admin/categories");
}

export async function uploadFileAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/files?error=${encodeURIComponent("请选择要上传的文件。")}`);
  }

  let uploadedFileId: string | null = null;
  try {
    const stored = await saveUploadedFile(file, {
      folder: "files",
      maxBytes: adminFileUploadMaxBytes
    });
    const record = await prisma.file.create({
      data: {
        fileName: stored.fileName,
        filePath: stored.filePath,
        fileUrl: stored.fileUrl,
        fileSize: BigInt(stored.fileSize),
        mimeType: stored.mimeType
      }
    });
    await writeAdminAuditLogBestEffort({
      adminId: admin.id,
      action: "file.upload",
      targetType: "file",
      targetId: record.id,
      summary: "Uploaded file and created file record.",
      metadata: { fileName: stored.fileName, storage: stored.storage, fileSize: stored.fileSize }
    });
    uploadedFileId = record.id;
  } catch (error) {
    const message = normalizeUploadActionError(error);
    await writeAdminAuditLogBestEffort({
      adminId: admin.id,
      action: "file.upload.failed",
      targetType: "file",
      targetId: null,
      summary: "File upload failed before creating file record.",
      metadata: { fileName: file.name, fileSize: file.size, error: message }
    });
    redirect(`/admin/files?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/files");
  redirect(`/admin/files?uploaded=1&fileId=${uploadedFileId}`);
}

export async function upsertFileAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const toolId = parseOptionalString(formData.get("toolId"));
  const filePath = z.string().min(1).parse(formData.get("filePath"));
  const fileUrl = parseOptionalString(formData.get("fileUrl")) ?? derivePublicUploadUrlFromFilePath(filePath);
  const data = {
    toolId,
    fileName: z.string().min(1).parse(formData.get("fileName")),
    filePath,
    fileUrl,
    fileSize: parseOptionalString(formData.get("fileSize")) ? BigInt(parseNumberField(formData.get("fileSize"), 0)) : null,
    version: parseOptionalString(formData.get("version")),
    mimeType: parseOptionalString(formData.get("mimeType"))
  };

  let fileId = id;
  if (id) {
    await prisma.file.update({ where: { id }, data });
  } else {
    const created = await prisma.file.create({ data });
    fileId = created.id;
  }
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "file.update" : "file.create",
    targetType: "file",
    targetId: fileId,
    summary: id ? "Updated file record." : "Created file record.",
    metadata: { toolId, fileName: data.fileName }
  });
  revalidatePath("/admin/files");
}

export async function deleteFileAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    redirect(`/admin/files?error=${encodeURIComponent("文件不存在，可能已经被删除。")}`);
  }

  const [primaryBindings, downloadLogs] = await prisma.$transaction([
    prisma.tool.updateMany({ where: { downloadFileId: id }, data: { downloadFileId: null } }),
    prisma.downloadLog.deleteMany({ where: { fileId: id } }),
    prisma.file.delete({ where: { id } })
  ]);

  let physicalDeleted = false;
  let cosDeleted = false;
  let warning: string | null = null;
  try {
    if (parseCosFilePath(file.filePath)) {
      const result = await deleteStoredCosObjectIfConfigured(file.filePath);
      cosDeleted = result.deleted;
    } else {
      physicalDeleted = await deleteStoredLocalFileIfSafe(file.filePath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    warning = errorMessage;
    await writeAdminAuditLog({
      adminId: admin.id,
      action: parseCosFilePath(file.filePath) ? "file.delete.cos_failed" : "file.delete.local_failed",
      targetType: "file",
      targetId: id,
      summary: parseCosFilePath(file.filePath)
        ? "Deleted file record, but COS remote object deletion failed."
        : "Deleted file record, but local physical file deletion failed.",
      metadata: {
        fileName: file.fileName,
        filePath: file.filePath,
        error: errorMessage
      }
    });
  }

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "file.delete",
    targetType: "file",
    targetId: id,
    summary: "Deleted file record and cleaned related bindings.",
    metadata: {
      fileName: file.fileName,
      filePath: file.filePath,
      primaryBindings: primaryBindings.count,
      downloadLogs: downloadLogs.count,
      physicalDeleted,
      cosDeleted,
      warning
    }
  });

  revalidatePath("/admin/files");
  revalidatePath("/admin/software");
  revalidatePath("/admin/online-tools");
  const warningQuery = warning ? `&warning=${encodeURIComponent(`文件记录已删除，但远程/物理文件清理失败：${warning}`)}` : "";
  redirect(`/admin/files?deleted=1${warningQuery}`);
}

export async function upsertToolAction(formData: FormData) {
  const admin = await requireAdmin();
  const type = z.enum(["software", "online", "skill_learning"]).parse(formData.get("type"));
  const adminPath = getAdminToolBasePath(type);
  let savedToolId = parseOptionalString(formData.get("id"));

  try {
    const id = parseOptionalString(formData.get("id"));
    const name = z.string().min(1).parse(formData.get("name"));
    const englishName = parseOptionalString(formData.get("englishName"));
    const slugInput = parseOptionalString(formData.get("slug"));
    const generatedFallbackSeed = id ?? Date.now().toString(36);
    let resolvedSlug = resolveToolSlug({ name, slugInput, fallbackSeed: generatedFallbackSeed });
    // Ensure slug uniqueness - resolveToolSlug does not check the database
    if (!id) {
      let collision = await prisma.tool.findFirst({ where: { slug: resolvedSlug } });
      if (collision) {
        const baseSlug = resolvedSlug;
        let retry = 0;
        const suffix = () => Math.random().toString(36).slice(2, 8);
        while (collision) {
          resolvedSlug = `${baseSlug}-${suffix()}`;
          retry += 1;
          collision = await prisma.tool.findFirst({ where: { slug: resolvedSlug } });
          if (retry > 10) break;
        }
      }
    }
    const safeToolKey = resolvedSlug;
    const uploadedCoverImage = await saveAdminImageUpload(formData.get("coverImageFile"), `tool-cover-${safeToolKey}`);
    const downloadFileUrl = parseDownloadFileUrl(formData.get("downloadFileUrl"));
    const selectedDownloadFileId = parseOptionalString(formData.get("downloadFileId"));
    const priceSpecs = parseToolPriceSpecsFromFormData(formData);
    const primaryPriceSpec = getPrimaryToolPriceSpec(priceSpecs);
    const resolvedPurchasePrice = primaryPriceSpec?.price ?? parseNumberField(formData.get("downloadPrice"), 0);
    const existingProductImages = formData
      .getAll("existingScreenshots")
      .map((value) => String(value ?? ""))
      .filter(Boolean);
    const uploadedProductImages = await saveAdminImageUploads(formData.getAll("screenshotFiles"), `tool-product-${safeToolKey}`);
    const data = {
      name,
      englishName,
      slug: resolvedSlug,
      type,
      categoryId: parseOptionalString(formData.get("categoryId")),
      shortDescription: normalizeToolSummaryForStorage(z.string().min(1).parse(formData.get("shortDescription"))),
      content: normalizeToolContentForStorage(z.string().min(1).parse(formData.get("content"))),
      coverImage: uploadedCoverImage ?? parseOptionalString(formData.get("coverImage")),
      screenshots: mergeToolProductImages(existingProductImages, uploadedProductImages),
      version: parseOptionalString(formData.get("version")),
      systemRequirement: parseOptionalString(formData.get("systemRequirement")),
      isVipRequired: parseBooleanField(formData.get("isVipRequired")),
      isDownloadPaid: type === "software" && resolvedPurchasePrice > 0,
      isDownloadLinkVipOnly: type === "software" && resolvedPurchasePrice > 0,
      isHomeRecommended: parseBooleanField(formData.get("isHomeRecommended")),
      downloadPrice: resolvedPurchasePrice,
      onlineUrl: parseOptionalString(formData.get("onlineUrl")),
      downloadFileId: selectedDownloadFileId,
      status: z.enum(["draft", "published", "offline"]).parse(formData.get("status") ?? "draft"),
      sortOrder: parseNumberField(formData.get("sortOrder"), 0)
    };

    if (id) {
      await prisma.tool.update({ where: { id }, data });
      savedToolId = id;
    } else {
      const created = await prisma.tool.create({ data });
      savedToolId = created.id;
    }
    if (!savedToolId) throw new Error("Tool save failed.");
    await syncToolPriceSpecs(savedToolId, priceSpecs);
    if (downloadFileUrl && savedToolId) {
      const directDownloadFileId = await upsertDirectDownloadFileForTool({
        toolId: savedToolId,
        currentFileId: data.downloadFileId,
        toolName: name,
        version: data.version,
        downloadFileUrl
      });
      await prisma.tool.update({ where: { id: savedToolId }, data: { downloadFileId: directDownloadFileId } });
      data.downloadFileId = directDownloadFileId;
    }
    await writeAdminAuditLog({
      adminId: admin.id,
      action: id ? "tool.update" : "tool.create",
      targetType: "tool",
      targetId: savedToolId,
      summary: id ? "Updated tool." : "Created tool.",
      metadata: { type, name, slug: data.slug, status: data.status, downloadFileUrl: downloadFileUrl ?? null, priceSpecs: priceSpecs.length }
    });
    revalidatePath(adminPath);
    revalidatePath("/admin/files");
    revalidateTag("public-tools");
    revalidatePath("/");
    const listingPath = getToolListingPath(type);
    const canonicalToolPath = buildCanonicalToolPath(
      {
        slug: data.slug,
        name,
        englishName,
        type
      },
      "zh"
    );
    revalidatePath(listingPath);
    revalidatePath(canonicalToolPath);
    if (data.status === "published") {
      const indexNowUrls = [listingPath, canonicalToolPath];
      const baiduPushUrls = [listingPath, canonicalToolPath];
      await notifyIndexNow(indexNowUrls);
      await notifyBaiduSearch(baiduPushUrls, { source: "admin-tool-upsert", toolId: savedToolId, type });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请检查表单内容。";
    const returnTo = parseOptionalString(formData.get("returnTo")) ?? adminPath;
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(`${getAdminToolEditPath(type, savedToolId ?? "new")}?saved=1`);
}

export async function upsertToolTagAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const name = z.string().min(1).parse(formData.get("name"));
  const data = {
    name,
    slug: parseOptionalString(formData.get("slug")) ?? tagSlug(name),
    color: parseOptionalString(formData.get("color")),
    description: parseOptionalString(formData.get("description")),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active"),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0)
  };
  let tagId = id;
  if (id) {
    await prisma.toolTag.update({ where: { id }, data });
  } else {
    const created = await prisma.toolTag.create({ data });
    tagId = created.id;
  }
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "tool_tag.update" : "tool_tag.create",
    targetType: "tool_tag",
    targetId: tagId,
    summary: id ? "Updated tool tag." : "Created tool tag.",
    metadata: { name, slug: data.slug, status: data.status }
  });
  revalidatePath("/admin/tags");
}

export async function updateToolTagsAction(formData: FormData) {
  const admin = await requireAdmin();
  const toolId = idSchema.parse(formData.get("toolId"));
  const tagNames = parseTagNames(String(formData.get("tags") ?? ""));
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.toolTag.upsert({
        where: { name },
        update: {},
        create: { name, slug: tagSlug(name) }
      })
    )
  );

  await prisma.$transaction([
    prisma.toolTagLink.deleteMany({ where: { toolId } }),
    ...tags.map((tag) => prisma.toolTagLink.create({ data: { toolId, tagId: tag.id } }))
  ]);
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "tool.tags.update",
    targetType: "tool",
    targetId: toolId,
    summary: "Updated tool tag bindings.",
    metadata: { tags: tagNames }
  });
  revalidatePath("/admin/tags");
  revalidatePath("/admin/software");
  revalidatePath("/admin/online-tools");
}

export async function deleteToolAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const type = z.enum(["software", "online", "skill_learning"]).parse(formData.get("type"));
  const adminPath = getAdminToolBasePath(type);
  const existingTool = await prisma.tool.findUnique({ where: { id } });
  if (!existingTool) {
    redirect(`${adminPath}?error=${encodeURIComponent("工具不存在，可能已经被删除。")}`);
  }
  const cleanup = await prisma.$transaction(async (tx) => {
    const [orders, purchases, downloadLogs, usageLogs, comments, tutorials, faqs, changelogs, tagLinks, files] = await Promise.all([
      tx.order.updateMany({ where: { toolId: id }, data: { toolId: null } }),
      tx.toolPurchase.deleteMany({ where: { toolId: id } }),
      tx.downloadLog.deleteMany({ where: { toolId: id } }),
      tx.toolUsageLog.deleteMany({ where: { toolId: id } }),
      tx.comment.deleteMany({ where: { toolId: id } }),
      tx.tutorial.deleteMany({ where: { toolId: id } }),
      tx.toolFaq.deleteMany({ where: { toolId: id } }),
      tx.toolChangelog.deleteMany({ where: { toolId: id } }),
      tx.toolTagLink.deleteMany({ where: { toolId: id } }),
      tx.file.updateMany({ where: { toolId: id }, data: { toolId: null } })
    ]);
    const tool = await tx.tool.delete({ where: { id } });
    return { tool, orders, purchases, downloadLogs, usageLogs, comments, tutorials, faqs, changelogs, tagLinks, files };
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "tool.delete",
    targetType: "tool",
    targetId: id,
    summary: "Deleted tool and cleaned dependent records.",
    metadata: {
      type,
      name: cleanup.tool.name,
      slug: cleanup.tool.slug,
      ordersDetached: cleanup.orders.count,
      purchasesDeleted: cleanup.purchases.count,
      downloadLogsDeleted: cleanup.downloadLogs.count,
      usageLogsDeleted: cleanup.usageLogs.count,
      commentsDeleted: cleanup.comments.count,
      tutorialsDeleted: cleanup.tutorials.count,
      faqsDeleted: cleanup.faqs.count,
      changelogsDeleted: cleanup.changelogs.count,
      tagLinksDeleted: cleanup.tagLinks.count,
      filesDetached: cleanup.files.count
    }
  });
  revalidatePath(adminPath);
  revalidatePath("/");
  redirect(`${adminPath}?deleted=1`);
}

export async function upsertTutorialAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const toolId = idSchema.parse(formData.get("toolId"));
  const data = {
    toolId,
    title: z.string().min(1).parse(formData.get("title")),
    content: normalizeToolContentForStorage(z.string().min(1).parse(formData.get("content"))),
    imageUrl: parseOptionalString(formData.get("imageUrl")),
    videoUrl: parseOptionalString(formData.get("videoUrl")),
    notes: parseOptionalString(formData.get("notes")),
    commonErrors: parseOptionalString(formData.get("commonErrors")),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active")
  };

  let tutorialId = id;
  if (id) {
    await prisma.tutorial.update({ where: { id }, data });
  } else {
    const created = await prisma.tutorial.create({ data });
    tutorialId = created.id;
  }
  if (!tutorialId) throw new Error("Tutorial save failed.");
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "tutorial.update" : "tutorial.create",
    targetType: "tutorial",
    targetId: tutorialId,
    summary: id ? "Updated tutorial." : "Created tutorial.",
    metadata: { toolId, title: data.title, status: data.status }
  });
  revalidatePath("/admin/tutorials");
  revalidatePath("/tutorials");
  if (data.status === "active") {
    const tool = await prisma.tool.findFirst({
      where: { id: toolId, status: "published" },
      select: { slug: true, name: true, englishName: true, type: true }
    });
    const indexNowUrls = ["/tutorials", tool ? buildCanonicalToolPath(tool, "zh") : null];
    await notifyIndexNow(indexNowUrls);
    await notifyBaiduSearch(indexNowUrls, { source: "admin-tutorial-upsert", tutorialId, toolId });
  }
  redirect(`/admin/tutorials/${tutorialId}?saved=1`);
}

export async function deleteTutorialAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const tutorial = await prisma.tutorial.delete({ where: { id } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "tutorial.delete",
    targetType: "tutorial",
    targetId: id,
    summary: "Deleted tutorial.",
    metadata: { toolId: tutorial.toolId, title: tutorial.title }
  });
  revalidatePath("/admin/tutorials");
  revalidatePath("/tutorials");
  redirect("/admin/tutorials?deleted=1");
}

export async function upsertToolFaqAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const data = {
    toolId: idSchema.parse(formData.get("toolId")),
    question: z.string().min(1).parse(formData.get("question")),
    answer: z.string().min(1).parse(formData.get("answer")),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active")
  };
  let faqId = id;
  if (id) {
    await prisma.toolFaq.update({ where: { id }, data });
  } else {
    const created = await prisma.toolFaq.create({ data });
    faqId = created.id;
  }
  if (!faqId) throw new Error("FAQ save failed.");
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "tool_faq.update" : "tool_faq.create",
    targetType: "tool_faq",
    targetId: faqId,
    summary: id ? "Updated tool FAQ." : "Created tool FAQ.",
    metadata: { toolId: data.toolId, question: data.question, status: data.status }
  });
  revalidatePath("/admin/faqs");
  redirect(`/admin/faqs/${faqId}?saved=1`);
}

export async function deleteToolFaqAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const faq = await prisma.toolFaq.delete({ where: { id } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "tool_faq.delete",
    targetType: "tool_faq",
    targetId: id,
    summary: "Deleted tool FAQ.",
    metadata: { toolId: faq.toolId, question: faq.question }
  });
  revalidatePath("/admin/faqs");
  redirect("/admin/faqs?deleted=1");
}

export async function upsertToolChangelogAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const releaseDate = parseOptionalString(formData.get("releaseDate"));
  const data = {
    toolId: idSchema.parse(formData.get("toolId")),
    version: z.string().min(1).parse(formData.get("version")),
    title: z.string().min(1).parse(formData.get("title")),
    content: z.string().min(1).parse(formData.get("content")),
    releaseDate: releaseDate ? new Date(releaseDate) : null,
    sortOrder: parseNumberField(formData.get("sortOrder"), 0),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active")
  };
  let changelogId = id;
  if (id) {
    await prisma.toolChangelog.update({ where: { id }, data });
  } else {
    const created = await prisma.toolChangelog.create({ data });
    changelogId = created.id;
  }
  if (!changelogId) throw new Error("Changelog save failed.");
  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "tool_changelog.update" : "tool_changelog.create",
    targetType: "tool_changelog",
    targetId: changelogId,
    summary: id ? "Updated tool changelog." : "Created tool changelog.",
    metadata: { toolId: data.toolId, version: data.version, title: data.title, status: data.status }
  });
  revalidatePath("/admin/changelogs");
  redirect(`/admin/changelogs/${changelogId}?saved=1`);
}

export async function deleteToolChangelogAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const changelog = await prisma.toolChangelog.delete({ where: { id } });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "tool_changelog.delete",
    targetType: "tool_changelog",
    targetId: id,
    summary: "Deleted tool changelog.",
    metadata: { toolId: changelog.toolId, version: changelog.version, title: changelog.title }
  });
  revalidatePath("/admin/changelogs");
  redirect("/admin/changelogs?deleted=1");
}

export async function updateSiteSettingAction(formData: FormData) {
  const admin = await requireAdmin();
  const key = z.string().min(1).parse(formData.get("key"));
  const value = z.string().parse(formData.get("value") ?? "");
  const description = parseOptionalString(formData.get("description"));
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value, description },
    create: { key, value, description }
  });
  await writeAdminAuditLog({
    adminId: admin.id,
    action: "site.setting.update",
    targetType: "site_setting",
    targetId: key,
    summary: "Updated site setting.",
    metadata: { key }
  });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/software");
  revalidatePath("/account-services");
}

export async function updatePaymentQrCodesAction(formData: FormData) {
  const admin = await requireAdmin();
  let alipayQr = "";
  let wechatQr = "";

  try {
    alipayQr = await resolvePaymentQrCodeInput(formData.get("alipayQr"), formData.get("alipayQrFile"), "alipay");
    wechatQr = await resolvePaymentQrCodeInput(formData.get("wechatQr"), formData.get("wechatQrFile"), "wechat");

    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key: "alipay_qr" },
        update: { value: alipayQr, description: "支付宝个人收款码图片地址，用于订单支付页展示。" },
        create: { key: "alipay_qr", value: alipayQr, description: "支付宝个人收款码图片地址，用于订单支付页展示。" }
      }),
      prisma.siteSetting.upsert({
        where: { key: "wechat_qr" },
        update: { value: wechatQr, description: "微信个人收款码图片地址，用于订单支付页展示。" },
        create: { key: "wechat_qr", value: wechatQr, description: "微信个人收款码图片地址，用于订单支付页展示。" }
      })
    ]);

    await writeAdminAuditLog({
      adminId: admin.id,
      action: "payment_qr.update",
      targetType: "site_setting",
      targetId: "payment_qr",
      summary: "Updated payment QR codes.",
      metadata: { alipayQr: Boolean(alipayQr), wechatQr: Boolean(wechatQr) }
    });
  } catch (error) {
    const message = encodeURIComponent(normalizeUploadActionError(error));
    redirect(`/admin/payment-codes?error=${message}`);
  }

  revalidatePath("/admin/payment-codes");
  revalidatePath("/admin/settings");
  revalidatePath("/orders/[id]/pay", "page");
  redirect("/admin/payment-codes?saved=1");
}

export async function goToPayAction(formData: FormData) {
  const orderId = idSchema.parse(formData.get("orderId"));
  redirect(`/orders/${orderId}/pay`);
}

function parseNewsDateField(value: FormDataEntryValue | null) {
  const text = parseOptionalString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMultilineItems(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function generateAiNewsEnglishDraftAction(
  _prevState: AiNewsTranslationActionState | null,
  formData: FormData
): Promise<AiNewsTranslationActionState> {
  await requireAdmin();

  try {
    const draft = await generateAiNewsEnglishDraft({
      title: z.string().min(1).parse(formData.get("title")),
      subtitle: parseOptionalString(formData.get("subtitle")) ?? "",
      summary: z.string().min(1).parse(formData.get("summary")),
      content: z.string().min(1).parse(formData.get("content")),
      keyTakeaways: parseMultilineItems(formData.get("keyTakeaways")),
      impactNotes: parseOptionalString(formData.get("impactNotes")) ?? "",
      conclusion: parseOptionalString(formData.get("conclusion")) ?? "",
      seoTitle: parseOptionalString(formData.get("seoTitle")) ?? "",
      seoDescription: parseOptionalString(formData.get("seoDescription")) ?? "",
      keywords: parseOptionalString(formData.get("keywords")) ?? ""
    });

    return {
      ok: true,
      message: "English content generated successfully.",
      data: draft
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to generate English content."
    };
  }
}

function parseExternalSources(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [title = "", url = "", sourceType = "authority_media", description = ""] = line
        .split("|")
        .map((part) => part.trim());
      return { title, url, sourceType, description: description || null, sortOrder: index };
    })
    .filter((source) => source.title && /^https?:\/\//i.test(source.url));
}

async function resolveUniqueNewsSlug(input: { title: string; slugInput?: string | null; fallbackSeed: string; id?: string | null }) {
  let slug = resolveNewsSlug(input);
  const baseSlug = slug;
  let retry = 0;

  while (await prisma.newsArticle.findFirst({ where: { slug, ...(input.id ? { id: { not: input.id } } : {}) }, select: { id: true } })) {
    retry += 1;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    if (retry > 10) break;
  }

  return slug;
}

async function syncNewsArticleTags(articleId: string, rawTags: FormDataEntryValue | null) {
  const tagNames = parseTagNames(String(rawTags ?? ""));
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.newsTag.upsert({
        where: { name },
        update: { status: "active" },
        create: { name, slug: tagSlug(name), status: "active" }
      })
    )
  );

  await prisma.$transaction([
    prisma.newsArticleTag.deleteMany({ where: { articleId } }),
    ...tags.map((tag) => prisma.newsArticleTag.create({ data: { articleId, tagId: tag.id } }))
  ]);
}

async function syncNewsExternalSources(articleId: string, sources: ReturnType<typeof parseExternalSources>) {
  await prisma.$transaction([
    prisma.newsExternalSource.deleteMany({ where: { articleId } }),
    ...sources.map((source) => prisma.newsExternalSource.create({ data: { articleId, ...source } }))
  ]);
}

async function readAiNewsImportHtml(formData: FormData) {
  const file = formData.get("htmlFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 256 * 1024) throw new Error("HTML 文件不能超过 256KB。");
    return file.text();
  }

  return String(formData.get("html") ?? "");
}

function parseAiNewsImportPublishMode(value: FormDataEntryValue | null) {
  return value === "published" ? "published" : "draft";
}

export async function importNewsArticleHtmlAction(formData: FormData) {
  await requireAdmin();

  let result: Awaited<ReturnType<typeof importAiNewsArticle>>;
  try {
    const html = await readAiNewsImportHtml(formData);
    const payload = buildAiNewsImportPayloadFromHtml({
      html,
      publishMode: parseAiNewsImportPublishMode(formData.get("publishMode")),
      importBatchId: parseOptionalString(formData.get("importBatchId")) ?? undefined,
      categoryName: parseOptionalString(formData.get("categoryName")) ?? undefined,
      categorySlug: parseOptionalString(formData.get("categorySlug")) ?? undefined,
      tags: parseTagNames(String(formData.get("tags") ?? ""))
    });
    result = await importAiNewsArticle(payload);

    revalidatePath("/admin/ai-news");
    if (result.status === "published") {
      revalidatePath("/ai-news");
      revalidatePath("/en/ai-news");
      revalidatePath(`/ai-news/${result.canonicalSlug}`);
      revalidatePath(`/en/ai-news/${result.canonicalSlug}`);
      const indexNowUrls = ["/ai-news", result.publicUrl];
      await notifyIndexNow(indexNowUrls);
      await notifyBaiduSearch([result.publicUrl], { source: "admin-ai-news-html-import", articleId: result.articleId });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "HTML 导入失败，请检查文章内容。";
    redirect(`/admin/ai-news/import?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/ai-news/${result.articleId}?saved=1`);
}

export async function upsertNewsCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const name = z.string().min(1).parse(formData.get("name"));
  const slug = resolveNewsSlug({ title: name, slugInput: parseOptionalString(formData.get("slug")), fallbackSeed: id ?? Date.now().toString(36) });
  const data = {
    name,
    slug,
    description: parseOptionalString(formData.get("description")),
    status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active"),
    sortOrder: parseNumberField(formData.get("sortOrder"), 0)
  };
  const saved = id ? await prisma.newsCategory.update({ where: { id }, data }) : await prisma.newsCategory.create({ data });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "news_category.update" : "news_category.create",
    targetType: "news_category",
    targetId: saved.id,
    summary: id ? "Updated news category." : "Created news category.",
    metadata: { name, slug }
  });
  revalidatePath("/admin/ai-news");
  revalidatePath("/ai-news");
  revalidatePath("/en/ai-news");
}

export async function upsertNewsArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  let savedId = parseOptionalString(formData.get("id"));
  const returnTo = parseOptionalString(formData.get("returnTo")) ?? "/admin/ai-news";

  try {
    const id = savedId;
    const title = z.string().min(1).parse(formData.get("title"));
    const slug = await resolveUniqueNewsSlug({
      title,
      slugInput: parseOptionalString(formData.get("slug")),
      fallbackSeed: id ?? Date.now().toString(36),
      id
    });
    const status = z.enum(["draft", "published", "archived"]).parse(formData.get("status") ?? "draft");
    const publishedAt = parseNewsDateField(formData.get("publishedAt")) ?? (status === "published" ? new Date() : null);
    const data = {
      title,
      slug,
      subtitle: parseOptionalString(formData.get("subtitle")),
      description: parseOptionalString(formData.get("description")),
      keywords: parseOptionalString(formData.get("keywords")),
      summary: z.string().min(1).parse(formData.get("summary")),
      content: z.string().min(1).parse(formData.get("content")),
      coverImage: parseOptionalString(formData.get("coverImage")),
      videoUrl: parseOptionalString(formData.get("videoUrl")),
      videoTitle: parseOptionalString(formData.get("videoTitle")),
      videoDescription: parseOptionalString(formData.get("videoDescription")),
      author: parseOptionalString(formData.get("author")),
      status,
      categoryId: parseOptionalString(formData.get("categoryId")),
      publishedAt,
      readingTime: Math.max(1, parseNumberField(formData.get("readingTime"), 5)),
      viewCount: Math.max(0, parseNumberField(formData.get("viewCount"), 0)),
      likeCount: Math.max(0, parseNumberField(formData.get("likeCount"), 0)),
      favoriteCount: Math.max(0, parseNumberField(formData.get("favoriteCount"), 0)),
      isFeatured: parseBooleanField(formData.get("isFeatured")),
      isPinned: parseBooleanField(formData.get("isPinned")),
      sortOrder: parseNumberField(formData.get("sortOrder"), 0),
      seoTitle: parseOptionalString(formData.get("seoTitle")),
      seoDescription: parseOptionalString(formData.get("seoDescription")),
      seoKeywords: parseOptionalString(formData.get("seoKeywords")),
      canonicalUrl: parseOptionalString(formData.get("canonicalUrl")),
      keyTakeaways: parseMultilineItems(formData.get("keyTakeaways")),
      impactNotes: parseOptionalString(formData.get("impactNotes")),
      conclusion: parseOptionalString(formData.get("conclusion")),
      relatedArticleIds: parseNewsRelationIds(String(formData.get("relatedArticleIds") ?? "")),
      relatedToolIds: parseNewsRelationIds(String(formData.get("relatedToolIds") ?? "")),
      relatedTutorialIds: parseNewsRelationIds(String(formData.get("relatedTutorialIds") ?? "")),
      englishTitle: parseOptionalString(formData.get("englishTitle")),
      englishSubtitle: parseOptionalString(formData.get("englishSubtitle")),
      englishDescription: parseOptionalString(formData.get("englishDescription")),
      englishSummary: parseOptionalString(formData.get("englishSummary")),
      englishContent: parseOptionalString(formData.get("englishContent")),
      englishKeywords: parseOptionalString(formData.get("englishKeywords")),
      englishSeoTitle: parseOptionalString(formData.get("englishSeoTitle")),
      englishSeoDescription: parseOptionalString(formData.get("englishSeoDescription")),
      englishSeoKeywords: parseOptionalString(formData.get("englishSeoKeywords")),
      englishKeyTakeaways: parseMultilineItems(formData.get("englishKeyTakeaways")),
      englishImpactNotes: parseOptionalString(formData.get("englishImpactNotes")),
      englishConclusion: parseOptionalString(formData.get("englishConclusion"))
    };

    if (id) {
      await prisma.newsArticle.update({ where: { id }, data });
      savedId = id;
    } else {
      const created = await prisma.newsArticle.create({ data });
      savedId = created.id;
    }
    if (!savedId) throw new Error("News article save failed.");

    await syncNewsArticleTags(savedId, formData.get("tags"));
    await syncNewsExternalSources(savedId, parseExternalSources(formData.get("externalSources")));

    await writeAdminAuditLog({
      adminId: admin.id,
      action: id ? "news_article.update" : "news_article.create",
      targetType: "news_article",
      targetId: savedId,
      summary: id ? "Updated news article." : "Created news article.",
      metadata: { title, slug, status }
    });

    revalidatePath("/admin/ai-news");
    revalidatePath("/ai-news");
    revalidatePath("/en/ai-news");
    const canonicalNewsSlug = resolveAiNewsCanonicalSlug({
      slug,
      title,
      englishTitle: data.englishTitle
    });
    revalidatePath(`/ai-news/${canonicalNewsSlug}`);
    revalidatePath(`/en/ai-news/${canonicalNewsSlug}`);
    if (status === "published") {
      const indexNowUrls = [
        "/ai-news",
        buildCanonicalAiNewsPath(
          {
            slug,
            title,
            englishTitle: data.englishTitle
          },
          "zh"
        )
      ];
      await notifyIndexNow(indexNowUrls);
      await notifyBaiduSearch(indexNowUrls, { source: "admin-ai-news-upsert", articleId: savedId });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请检查资讯表单。";
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/ai-news/${savedId}?saved=1`);
}

export async function archiveNewsArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const article = await prisma.newsArticle.update({ where: { id }, data: { status: "archived" } });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "news_article.archive",
    targetType: "news_article",
    targetId: id,
    summary: "Archived news article.",
    metadata: { title: article.title, slug: article.slug }
  });

  revalidatePath("/admin/ai-news");
  revalidatePath("/ai-news");
  revalidatePath("/en/ai-news");
  const archivedCanonicalNewsSlug = resolveAiNewsCanonicalSlug({
    slug: article.slug,
    title: article.title,
    englishTitle: article.englishTitle
  });
  revalidatePath(`/ai-news/${archivedCanonicalNewsSlug}`);
  revalidatePath(`/en/ai-news/${archivedCanonicalNewsSlug}`);
  redirect("/admin/ai-news?archived=1");
}

export async function deleteNewsArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const article = await prisma.newsArticle.findUnique({
    where: { id },
    select: { id: true, title: true, englishTitle: true, slug: true, status: true }
  });
  if (!article) {
    redirect(`/admin/ai-news?error=${encodeURIComponent("资讯不存在，可能已经被删除。")}`);
  }

  await prisma.$transaction([
    prisma.newsArticleTag.deleteMany({ where: { articleId: id } }),
    prisma.newsExternalSource.deleteMany({ where: { articleId: id } }),
    prisma.newsArticleFavorite.deleteMany({ where: { articleId: id } }),
    prisma.newsArticleLike.deleteMany({ where: { articleId: id } }),
    prisma.newsArticle.delete({ where: { id } })
  ]);

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "news_article.delete",
    targetType: "news_article",
    targetId: id,
    summary: "Deleted news article and cleaned related records.",
    metadata: { title: article.title, slug: article.slug, status: article.status }
  });

  revalidatePath("/admin/ai-news");
  revalidatePath("/ai-news");
  revalidatePath("/en/ai-news");
  const deletedCanonicalNewsSlug = resolveAiNewsCanonicalSlug({
    slug: article.slug,
    title: article.title,
    englishTitle: article.englishTitle
  });
  revalidatePath(`/ai-news/${deletedCanonicalNewsSlug}`);
  revalidatePath(`/en/ai-news/${deletedCanonicalNewsSlug}`);
  redirect("/admin/ai-news?deleted=1");
}

export async function upsertNewsKeywordInterventionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const keyword = z.string().min(1).parse(formData.get("keyword")).trim();
  const locale = z.enum(["zh", "en"]).parse(formData.get("locale") ?? "zh");
  const isPinned = parseBooleanField(formData.get("isPinned"));
  const isHidden = parseBooleanField(formData.get("isHidden"));
  const displayName = parseOptionalString(formData.get("displayName"));
  const weightBoost = parseNumberField(formData.get("weightBoost"), 0);

  const saved = id
    ? await prisma.newsKeywordIntervention.update({
        where: { id },
        data: { keyword, locale, isPinned, isHidden, displayName, weightBoost }
      })
    : await prisma.newsKeywordIntervention.upsert({
        where: { keyword_locale: { keyword, locale } },
        update: { isPinned, isHidden, displayName, weightBoost },
        create: { keyword, locale, isPinned, isHidden, displayName, weightBoost }
      });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "news_keyword_intervention.upsert",
    targetType: "news_keyword_intervention",
    targetId: saved.id,
    summary: id ? "Updated AI news keyword intervention." : "Created AI news keyword intervention.",
    metadata: { keyword, locale, isPinned, isHidden, displayName, weightBoost }
  });

  revalidatePath("/admin/ai-news");
  revalidatePath("/admin/ai-news/keywords");
  revalidatePath("/ai-news");
  revalidatePath("/en/ai-news");
  redirect("/admin/ai-news/keywords?saved=1");
}

export async function deleteNewsKeywordInterventionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));

  const deleted = await prisma.newsKeywordIntervention.delete({
    where: { id },
    select: { id: true, keyword: true, locale: true }
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "news_keyword_intervention.delete",
    targetType: "news_keyword_intervention",
    targetId: deleted.id,
    summary: "Deleted AI news keyword intervention.",
    metadata: { keyword: deleted.keyword, locale: deleted.locale }
  });

  revalidatePath("/admin/ai-news");
  revalidatePath("/admin/ai-news/keywords");
  revalidatePath("/ai-news");
  revalidatePath("/en/ai-news");
  redirect("/admin/ai-news/keywords?deleted=1");
}
