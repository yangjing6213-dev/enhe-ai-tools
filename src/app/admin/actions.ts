"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  getAdminAuditRequestContext,
  writeAdminAuditLog,
} from "@/lib/admin-audit";
import {
  deleteOrderForAdmin,
  deleteToolForAdmin,
  deleteUserForAdmin,
} from "@/lib/admin-delete";
import { prisma } from "@/lib/db";
import {
  buildSeoFriendlySlug,
  parseBooleanField,
  parseNumberField,
  parseOptionalString,
  resolveToolSlug
} from "@/lib/admin-form";
import { parseNewsRelationIds, resolveAiNewsCanonicalSlug, resolveNewsSlug } from "@/lib/ai-news";
import { normalizeSupportedAgents } from "@/lib/ai-skill";
import { hashPassword, requireAdmin } from "@/lib/auth";
import {
  createRefundRecordForAdmin,
  prepareRefundExecutionForAdmin,
  rejectRefundRecordForAdmin,
  updateOrderForAdmin,
} from "@/lib/admin-order-mutations";
import { sendRefundProcessedAdminEmail } from "@/lib/admin-email-notifications";
import { getAdminToolBasePath, getAdminToolEditPath } from "@/lib/admin-tool-routes";
import { buildAiNewsImportPayloadFromHtml } from "@/lib/ai-news-html-import";
import { importAiNewsArticle } from "@/lib/ai-news-import";
import { notifyBaiduSearch } from "@/lib/baidu-push";
import { notifyIndexNow } from "@/lib/indexnow";
import { createLicenseCode, createLumiLicenseCode, isUnlimitedLicenseKeyValid, normalizeLumiMachineCode, parseLicenseCode, parseLumiLicenseCodePayload } from "@/lib/license-generator";
import type { LicenseGeneratorActionState } from "@/lib/license-generator-action-state";
import { isLikelyUploadableImage } from "@/lib/media";
import { buildRefundProcessedNotification } from "@/lib/notification-messages";
import { createUserNotification } from "@/lib/notifications";
import {
  executeZpayRefund,
  markStaleZpayRefundDispatchesAmbiguous,
  resolveAmbiguousZpayRefund,
  retryZpayRefundFinalization,
  zpayRefundDispatchStaleAfterMs,
  type RefundTerminalTransitionResult,
} from "@/lib/refund-execution";
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
import { parseTopicDelimitedRows } from "@/lib/ai-news-topic-config";
import { adminFileUploadMaxBytes } from "@/lib/upload-limits";
import { generateAiNewsEnglishDraft } from "@/lib/ai-news-translation";
import { buildProductDemoPath } from "@/lib/product-demos";
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

type AdminRefundExecutionResult = RefundTerminalTransitionResult | {
  outcome: "failed";
  changed: false;
};

async function executeZpayRefundForAdmin(input: {
  refundId: string;
  adminId: string;
  note?: string | null;
  refundProofImage?: string | null;
  refundConfirmation?: string | null;
}): Promise<AdminRefundExecutionResult> {
  try {
    return await executeZpayRefund(input);
  } catch (error) {
    console.error("[admin-refund] ZPAY execution failed", error);
    return { outcome: "failed", changed: false };
  }
}

function getRefundExecutionErrorCode(result: AdminRefundExecutionResult) {
  switch (result.outcome) {
    case "ambiguous":
      return "refund_ambiguous";
    case "already_processing":
      return "refund_already_processing";
    case "finalize_retry":
      return "refund_finalize_retry";
    case "failed":
      return "refund_execution_failed";
    case "finalized":
    case "provider_rejected":
      return null;
  }
}

function getRefundServiceActionErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : null;
  switch (message) {
    case "REFUND_STATE_MISMATCH":
    case "REFUND_NOT_FOUND":
    case "REFUND_ORDER_NOT_FOUND":
    case "REFUND_PAYMENT_NOT_FOUND":
      return "refund_state_mismatch";
    case "LATE_PAYMENT_REFUND_MUST_BE_CONFIRMED":
      return "refund_late_payment_requires_provider_refund";
    case "REFUND_PROVIDER_REFERENCE_REQUIRED":
      return "refund_provider_reference_required";
    case "REFUND_PROVIDER_REFERENCE_INVALID":
      return "refund_provider_reference_invalid";
    case "REFUND_PROVIDER_REFERENCE_REUSED":
      return "refund_provider_reference_reused";
    case "REFUND_PROOF_REQUIRED":
      return "refund_proof_required";
    case "REFUND_PROOF_INVALID":
      return "refund_proof_invalid";
    default:
      return null;
  }
}

async function syncToolPriceSpecs(
  tx: Prisma.TransactionClient,
  toolId: string,
  specs: ToolPriceSpecDraft[],
) {
  const incomingIds = specs.map((spec) => spec.id).filter((id): id is string => Boolean(id));
  await tx.toolPriceSpec.updateMany({
    where: {
      toolId,
      ...(incomingIds.length ? { id: { notIn: incomingIds } } : {})
    },
    data: { status: "disabled" }
  });

  for (const spec of specs) {
    if (spec.id) {
      await tx.toolPriceSpec.updateMany({
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

    await tx.toolPriceSpec.create({
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

function revalidatePublicToolCatalog() {
  revalidateTag("public-tools");
  revalidatePath("/ai-skills");
  revalidatePath("/en/ai-skills");
  revalidatePath("/pricing");
  revalidatePath("/en/pricing");
  revalidatePath("/pricing.md");
}

function normalizeUploadActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "上传失败，请稍后重试。";
  const trimmed = message.trim();
  if (!trimmed) return "上传失败，请稍后重试。";
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}...` : trimmed;
}

async function saveAdminImageUpload(file: FormDataEntryValue | null, prefix: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  const stored = await saveUploadedFile(file, {
    folder: prefix,
    maxBytes: maxCoverImageBytes,
    accept: isLikelyUploadableImage,
    invalidTypeMessage: "请上传图片格式的封面图。"
  });
  return stored.storage === "cos" ? stored.filePath : stored.fileUrl;
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

function getToolListingPath(type: "software" | "online" | "skill_learning" | "ai_skill") {
  if (type === "skill_learning") return "/skill-learning";
  if (type === "ai_skill") return "/ai-skills";
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
  const licenseProduct = z.enum(["faceswap", "lumi-os"]).catch("faceswap").parse(formData.get("licenseProduct"));
  const licenseType = z.enum(["single", "unlimited"]).parse(formData.get("licenseType"));
  const machineId = parseOptionalString(formData.get("machineId"));
  const licenseId = parseOptionalString(formData.get("licenseId"));
  const note = parseOptionalString(formData.get("note")) ?? "";
  const adminKey = parseOptionalString(formData.get("adminKey"));
  const expiresAt = parseOptionalString(formData.get("expiresAt"));

  if (licenseProduct === "faceswap" && licenseType === "unlimited" && !isUnlimitedLicenseKeyValid(adminKey)) {
    return {
      ok: false,
      message: "请先输入正确密钥解锁无限授权码。",
      code: ""
    };
  }

  try {
    if (licenseProduct === "lumi-os") {
      const machineCode = normalizeLumiMachineCode(machineId ?? "");
      const code = createLumiLicenseCode({
        machineCode,
        licenseId,
        note,
        expiresAt
      });
      const payload = parseLumiLicenseCodePayload(code);

      await writeAdminAuditLog({
        adminId: admin.id,
        action: "license.generate",
        targetType: "license",
        targetId: machineCode,
        summary: "Generated Lumi OS one-machine license code.",
        metadata: {
          product: licenseProduct,
          machineCode,
          licenseId: payload.licenseId,
          note,
          expiresAt: payload.expiresAt ?? null
        }
      });

      return {
        ok: true,
        message: "Lumi OS 授权码生成成功。",
        code,
        payload: {
          product: "lumi-os",
          license_type: "single",
          machine_id: payload.machineCode,
          machineCode: payload.machineCode,
          licenseId: payload.licenseId,
          issued_at: payload.issuedAt,
          issuedAt: payload.issuedAt,
          expiresAt: payload.expiresAt,
          note
        }
      };
    }

    const code = createLicenseCode({ licenseType, machineId, note });
    const parsed = parseLicenseCode(code);
    await writeAdminAuditLog({
      adminId: admin.id,
      action: "license.generate",
      targetType: "license",
      targetId: parsed.payload?.machine_id ?? licenseType,
      summary: licenseType === "single" ? "Generated single-machine license code." : "Generated unlimited license code.",
      metadata: {
        product: licenseProduct,
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
            product: "faceswap",
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
  if (confirmDelete !== deleteUserConfirmationToken) {
    redirect(`/admin/users/${id}?error=${encodeURIComponent("请先勾选删除确认。")}`);
  }

  const result = await deleteUserForAdmin({
    db: prisma,
    userId: id,
    adminId: admin.id,
    auditContext: await getAdminAuditRequestContext(),
  });
  if (result.status === "not_found") {
    redirect(`/admin/users?error=${encodeURIComponent("用户不存在，可能已经被删除。")}`);
  }
  if (result.status === "rule_blocked") {
    redirect(`/admin/users/${id}?error=${encodeURIComponent(result.message)}`);
  }
  if (result.status === "blocked") {
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    redirect(`/admin/users/${id}?error=${result.code}&disabled=1`);
  }

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
  try {
    await updateOrderForAdmin({
      db: prisma,
      orderId: id,
      adminId: admin.id,
      amount,
      paymentMethod,
      orderStatus,
      auditContext: await getAdminAuditRequestContext(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "订单保存失败。";
    if (message === "ORDER_NOT_FOUND") {
      redirect(`/admin/orders?error=${encodeURIComponent("订单不存在，可能已经被删除。")}`);
    }
    if (
      message === "Order amount cannot change after payment creation." ||
      message === "Refunded status must be set by the refund workflow." ||
      message.includes("订单不能通过手动改状态")
    ) {
      redirect(`/admin/orders/${id}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/payments");
  revalidatePath("/user");
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function deleteOrderAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const result = await deleteOrderForAdmin({
    db: prisma,
    orderId: id,
    adminId: admin.id,
    auditContext: await getAdminAuditRequestContext(),
  });
  if (result.status === "not_found") {
    redirect(`/admin/orders?error=${encodeURIComponent("订单不存在，可能已经被删除。")}`);
  }
  if (result.status === "blocked") {
    redirect(`/admin/orders/${id}?error=${result.code}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/user");
  redirect("/admin/orders?deleted=1");
}

export async function createRefundRecordAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = idSchema.parse(formData.get("orderId"));
  const requestedStatus = z.enum(["pending", "completed", "rejected"]).parse(formData.get("status") ?? "completed");
  const reason = z.string().min(2, "必须填写售后/退款原因").parse(formData.get("reason"));
  const note = parseOptionalString(formData.get("note"));
  const refundReceiverQr = parseOptionalString(formData.get("refundReceiverQr"));
  const refundProofImage = parseOptionalString(formData.get("refundProofImage"));
  let created: Awaited<ReturnType<typeof createRefundRecordForAdmin>>;
  try {
    created = await createRefundRecordForAdmin({
      db: prisma,
      orderId,
      adminId: admin.id,
      amount: String(formData.get("amount") ?? ""),
      requestedStatus,
      reason,
      note,
      refundReceiverQr,
      refundProofImage,
      auditContext: await getAdminAuditRequestContext(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "退款金额无效。";
    if (message === "ORDER_NOT_FOUND") {
      redirect(`/admin/orders?error=${encodeURIComponent("订单不存在，无法记录售后/退款。")}`);
    }
    if (message === "REFUND_ATTEMPT_EXISTS") {
      redirect(`/admin/orders/${orderId}?error=refund_attempt_exists`);
    }
    if (message === "REFUND_STATUS_NOT_ALLOWED") {
      redirect(`/admin/orders?error=${encodeURIComponent("当前订单状态不允许创建退款记录。")}`);
    }
    if (message.startsWith("Refund amount ")) {
      redirect(`/admin/orders?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }

  let processedStatus: "completed" | "rejected" | null = null;
  let terminalTransitionChanged = false;
  if (requestedStatus === "completed") {
    const prepared = await prepareRefundExecutionForAdmin({
      db: prisma,
      refundId: created.refund.id,
      adminId: admin.id,
      note,
      refundProofImage,
    });
    if (prepared.kind === "zpay") {
      const result = await executeZpayRefundForAdmin({
        refundId: created.refund.id,
        adminId: admin.id,
        note,
        refundProofImage,
      });
      const errorCode = getRefundExecutionErrorCode(result);
      if (errorCode) {
        redirect(`/admin/refunds/${created.refund.id}?error=${errorCode}`);
      }
      processedStatus = result.outcome === "finalized" ? "completed" : "rejected";
      terminalTransitionChanged = result.changed;
    } else {
      processedStatus = "completed";
      terminalTransitionChanged = true;
    }
  } else if (requestedStatus === "rejected") {
    await rejectRefundRecordForAdmin({
      db: prisma,
      refundId: created.refund.id,
      adminId: admin.id,
      note,
      refundProofImage,
    });
    processedStatus = "rejected";
    terminalTransitionChanged = true;
  }

  if (processedStatus && terminalTransitionChanged) {
    await createUserNotification(
      created.order.userId,
      buildRefundProcessedNotification({
        orderId,
        orderNo: created.order.orderNo,
        status: processedStatus,
        note,
      }),
    );
    await sendRefundProcessedAdminEmail(orderId, {
      status: processedStatus,
      actorLabel: admin.email ?? admin.nickname ?? admin.id,
      note
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${created.refund.id}`);
  revalidatePath("/user");
  redirect(`/admin/orders/${orderId}?refund=1${processedStatus ? `&status=${processedStatus}` : ""}`);
}

export async function processRefundRecordAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("refundId"));
  const status = z.enum(["completed", "rejected"]).parse(formData.get("status"));
  const note = parseOptionalString(formData.get("note"));
  const refundProofImage = parseOptionalString(formData.get("refundProofImage"));
  const refundConfirmation = parseOptionalString(formData.get("refundConfirmation"));
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

  const resolvedNote = note ?? refund.note;
  const resolvedProofImage = refundProofImage ?? refund.refundProofImage;
  let result: AdminRefundExecutionResult;
  if (status === "completed") {
    const prepared = await prepareRefundExecutionForAdmin({
      db: prisma,
      refundId: id,
      adminId: admin.id,
      note: resolvedNote,
      refundProofImage: resolvedProofImage,
    });
    result = prepared.kind === "zpay"
      ? await executeZpayRefundForAdmin({
          refundId: id,
          adminId: admin.id,
          note: resolvedNote,
          refundProofImage: resolvedProofImage,
          refundConfirmation,
        })
      : { outcome: "finalized", changed: true };
  } else {
    const rejected = await rejectRefundRecordForAdmin({
      db: prisma,
      refundId: id,
      adminId: admin.id,
      note: resolvedNote,
      refundProofImage: resolvedProofImage,
    });
    result = { ...rejected, changed: true };
  }
  const errorCode = getRefundExecutionErrorCode(result);
  if (errorCode) {
    redirect(`/admin/refunds/${id}?error=${errorCode}`);
  }
  const processedStatus = result.outcome === "finalized" ? "completed" : "rejected";
  if (!result.changed) {
    redirect(`/admin/refunds/${id}?processed=1&status=${processedStatus}&unchanged=1`);
  }
  await createUserNotification(
    refund.requesterId ?? refund.order.userId,
    buildRefundProcessedNotification({
      orderId: refund.orderId,
      orderNo: refund.order.orderNo,
      status: processedStatus,
      note: resolvedNote
    })
  );
  await sendRefundProcessedAdminEmail(refund.orderId, {
    status: processedStatus,
    actorLabel: admin.email ?? admin.nickname ?? admin.id,
    note: resolvedNote
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${refund.orderId}`);
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${id}`);
  revalidatePath(`/orders/${refund.orderId}`);
  revalidatePath("/user");
  redirect(`/admin/refunds/${id}?processed=1&status=${processedStatus}`);
}

export async function recoverStaleRefundDispatchAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("refundId"));
  let markedAmbiguous = 0;
  try {
    const result = await markStaleZpayRefundDispatchesAmbiguous({
      refundId: id,
      adminId: admin.id,
      startedBefore: new Date(Date.now() - zpayRefundDispatchStaleAfterMs),
    });
    markedAmbiguous = result.markedAmbiguous;
  } catch (error) {
    console.error("[admin-refund] stale dispatch recovery failed", error);
    redirect(`/admin/refunds/${id}?error=refund_dispatch_recovery_failed`);
  }
  if (markedAmbiguous !== 1) {
    redirect(`/admin/refunds/${id}?error=refund_dispatch_not_stale`);
  }

  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${id}`);
  redirect(`/admin/refunds/${id}?recovered=1`);
}

export async function resolveAmbiguousRefundAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("refundId"));
  const resolution = z
    .enum(["provider_succeeded", "provider_rejected"])
    .safeParse(formData.get("resolution"));
  const note = parseOptionalString(formData.get("note"));
  const refundProofImage = parseOptionalString(formData.get("refundProofImage"));
  const providerRefundReference = parseOptionalString(formData.get("providerRefundReference"));

  if (!resolution.success) {
    redirect(`/admin/refunds/${id}?error=refund_resolution_invalid`);
  }
  if (!note || note.length < 2) {
    redirect(`/admin/refunds/${id}?error=refund_resolution_note_required`);
  }

  const refund = await prisma.orderRefundRecord.findUnique({
    where: { id },
    select: {
      orderId: true,
      requesterId: true,
      order: { select: { userId: true, orderNo: true } },
    },
  });
  if (!refund) {
    redirect(`/admin/refunds/${id}?error=refund_state_mismatch`);
  }

  let result: RefundTerminalTransitionResult;
  try {
    result = await resolveAmbiguousZpayRefund({
      refundId: id,
      adminId: admin.id,
      resolution: resolution.data,
      note,
      refundProofImage,
      providerRefundReference,
    });
  } catch (error) {
    console.error("[admin-refund] ambiguous resolution failed", error);
    const actionErrorCode = getRefundServiceActionErrorCode(error);
    if (actionErrorCode) {
      redirect(`/admin/refunds/${id}?error=${actionErrorCode}`);
    }
    redirect(`/admin/refunds/${id}?error=refund_resolution_failed`);
  }

  const errorCode = getRefundExecutionErrorCode(result);
  if (errorCode) {
    redirect(`/admin/refunds/${id}?error=${errorCode}`);
  }
  const processedStatus = result.outcome === "finalized" ? "completed" : "rejected";
  if (!result.changed) {
    redirect(`/admin/refunds/${id}?processed=1&status=${processedStatus}&unchanged=1`);
  }
  await createUserNotification(
    refund.requesterId ?? refund.order.userId,
    buildRefundProcessedNotification({
      orderId: refund.orderId,
      orderNo: refund.order.orderNo,
      status: processedStatus,
      note,
    }),
  );
  await sendRefundProcessedAdminEmail(refund.orderId, {
    status: processedStatus,
    actorLabel: admin.email ?? admin.nickname ?? admin.id,
    note,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${refund.orderId}`);
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${id}`);
  revalidatePath(`/orders/${refund.orderId}`);
  revalidatePath("/user");
  redirect(`/admin/refunds/${id}?processed=1&status=${processedStatus}`);
}

export async function retryRefundFinalizationAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("refundId"));
  const refund = await prisma.orderRefundRecord.findUnique({
    where: { id },
    select: {
      orderId: true,
      requesterId: true,
      note: true,
      order: { select: { userId: true, orderNo: true } },
    },
  });
  if (!refund) {
    redirect(`/admin/refunds/${id}?error=refund_state_mismatch`);
  }

  const resolvedNote = refund.note;
  let result: RefundTerminalTransitionResult;
  try {
    result = await retryZpayRefundFinalization({
      refundId: id,
      adminId: admin.id,
    });
  } catch (error) {
    console.error("[admin-refund] local finalization retry failed", error);
    const actionErrorCode = getRefundServiceActionErrorCode(error);
    if (actionErrorCode) {
      redirect(`/admin/refunds/${id}?error=${actionErrorCode}`);
    }
    redirect(`/admin/refunds/${id}?error=refund_finalization_failed`);
  }

  const errorCode = getRefundExecutionErrorCode(result);
  if (errorCode) {
    redirect(`/admin/refunds/${id}?error=${errorCode}`);
  }
  if (result.outcome !== "finalized") {
    redirect(`/admin/refunds/${id}?error=refund_state_mismatch`);
  }
  if (!result.changed) {
    redirect(`/admin/refunds/${id}?processed=1&status=completed&unchanged=1`);
  }

  await createUserNotification(
    refund.requesterId ?? refund.order.userId,
    buildRefundProcessedNotification({
      orderId: refund.orderId,
      orderNo: refund.order.orderNo,
      status: "completed",
      note: resolvedNote,
    }),
  );
  await sendRefundProcessedAdminEmail(refund.orderId, {
    status: "completed",
    actorLabel: admin.email ?? admin.nickname ?? admin.id,
    note: resolvedNote,
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${refund.orderId}`);
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${id}`);
  revalidatePath(`/orders/${refund.orderId}`);
  revalidatePath("/user");
  redirect(`/admin/refunds/${id}?processed=1&status=completed`);
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
    type: z.enum(["software", "online", "skill_learning", "ai_skill"]).parse(formData.get("type")),
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
  revalidatePath("/admin/ai-skills");
  const warningQuery = warning ? `&warning=${encodeURIComponent(`文件记录已删除，但远程/物理文件清理失败：${warning}`)}` : "";
  redirect(`/admin/files?deleted=1${warningQuery}`);
}

export async function upsertToolAction(formData: FormData) {
  const admin = await requireAdmin();
  const type = z.enum(["software", "online", "skill_learning", "ai_skill"]).parse(formData.get("type"));
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
    const isDownloadProduct = type === "software" || type === "ai_skill";
    const resolvedPurchasePrice = primaryPriceSpec?.price ?? (isDownloadProduct ? parseNumberField(formData.get("downloadPrice"), 0) : 0);
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
      videoUrl: parseOptionalString(formData.get("videoUrl")),
      videoTitle: parseOptionalString(formData.get("videoTitle")),
      videoDescription: parseOptionalString(formData.get("videoDescription")),
      videoUrl2: parseOptionalString(formData.get("videoUrl2")),
      videoTitle2: parseOptionalString(formData.get("videoTitle2")),
      videoDescription2: parseOptionalString(formData.get("videoDescription2")),
      videoUrl3: parseOptionalString(formData.get("videoUrl3")),
      videoTitle3: parseOptionalString(formData.get("videoTitle3")),
      videoDescription3: parseOptionalString(formData.get("videoDescription3")),
      version: parseOptionalString(formData.get("version")),
      systemRequirement: parseOptionalString(formData.get("systemRequirement")),
      supportedAgents: type === "ai_skill" ? normalizeSupportedAgents(formData.getAll("supportedAgents").map(String)) : [],
      isVipRequired: parseBooleanField(formData.get("isVipRequired")),
      isDownloadPaid: isDownloadProduct && resolvedPurchasePrice > 0,
      isDownloadLinkVipOnly: isDownloadProduct && resolvedPurchasePrice > 0,
      isHomeRecommended: parseBooleanField(formData.get("isHomeRecommended")),
      downloadPrice: resolvedPurchasePrice,
      onlineUrl: parseOptionalString(formData.get("onlineUrl")),
      downloadFileId: selectedDownloadFileId,
      status: z.enum(["draft", "published", "offline"]).parse(formData.get("status") ?? "draft"),
      sortOrder: parseNumberField(formData.get("sortOrder"), 0)
    };

    savedToolId = await prisma.$transaction(async (tx) => {
      const transactionToolId = id
        ? (await tx.tool.update({ where: { id }, data })).id
        : (await tx.tool.create({ data })).id;
      await syncToolPriceSpecs(tx, transactionToolId, priceSpecs);
      return transactionToolId;
    });
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
    revalidatePublicToolCatalog();
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
  revalidatePath("/admin/ai-skills");
}

export async function deleteToolAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const type = z.enum(["software", "online", "skill_learning", "ai_skill"]).parse(formData.get("type"));
  const adminPath = getAdminToolBasePath(type);
  const result = await deleteToolForAdmin({
    db: prisma,
    toolId: id,
    toolType: type,
    adminId: admin.id,
    auditContext: await getAdminAuditRequestContext(),
  });
  if (result.status === "not_found") {
    redirect(`${adminPath}?error=${encodeURIComponent("工具不存在，可能已经被删除。")}`);
  }
  if (result.status === "blocked") {
    redirect(`${getAdminToolEditPath(type, id)}?error=${result.code}`);
  }
  revalidatePath(adminPath);
  revalidatePath("/");
  revalidatePublicToolCatalog();
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
  revalidatePublicToolCatalog();
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
  revalidatePublicToolCatalog();
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

function parseTopicJsonRows(
  value: FormDataEntryValue | null,
  kind: "faq" | "source" | "action"
) {
  const text = String(value ?? "");
  if (kind === "faq") {
    return JSON.parse(JSON.stringify(parseTopicDelimitedRows(text, "faq"))) as Prisma.InputJsonValue;
  }
  if (kind === "source") {
    return JSON.parse(JSON.stringify(parseTopicDelimitedRows(text, "source"))) as Prisma.InputJsonValue;
  }
  return JSON.parse(JSON.stringify(parseTopicDelimitedRows(text, "action"))) as Prisma.InputJsonValue;
}

function parseProductDemoDateField(value: FormDataEntryValue | null) {
  const text = parseOptionalString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseProductDemoFaqRows(value: FormDataEntryValue | null) {
  const rows = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question = "", ...answerParts] = line.split("|");
      const answer = answerParts.join("|");
      return {
        question: question.trim(),
        answer: answer.trim()
      };
    })
    .filter((item) => item.question && item.answer);

  return JSON.parse(JSON.stringify(rows)) as Prisma.InputJsonValue;
}

const productDemoSlugSchema = z
  .string()
  .min(1, "slug 必填。")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写英文、数字和短横线。");

async function assertUniqueProductDemoSlug(slug: string, id?: string | null) {
  const existing = await prisma.productDemo.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true }
  });
  if (existing) throw new Error("slug 已存在，请更换一个唯一 slug。");
}

function revalidateProductDemoPaths(slug?: string | null) {
  revalidateTag("public-product-demos");
  revalidateTag("public-home");
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/product-demos");
  revalidatePath("/en/product-demos");
  revalidatePath("/admin/product-demos");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(buildProductDemoPath(slug, "zh"));
    revalidatePath(buildProductDemoPath(slug, "en"));
  }
}

export async function upsertProductDemoAction(formData: FormData) {
  const admin = await requireAdmin();
  let savedId = parseOptionalString(formData.get("id"));
  const returnTo = parseOptionalString(formData.get("returnTo")) ?? "/admin/product-demos";

  try {
    const id = savedId;
    const title = z.string().min(1, "标题必填。").parse(formData.get("title"));
    const slug = productDemoSlugSchema.parse(String(formData.get("slug") ?? "").trim());
    await assertUniqueProductDemoSlug(slug, id);
    const status = z.enum(["draft", "published", "archived"]).parse(formData.get("status") ?? "draft");
    const category = z.enum(["software", "skill_learning", "account_service"]).parse(formData.get("category") ?? "software");
    const uploadedCoverImage = await saveAdminImageUpload(formData.get("coverImageFile"), `product-demo-cover-${slug}`);
    const coverImage = uploadedCoverImage ?? z.string().min(1, "封面图必填。").parse(formData.get("coverImage"));
    const coverAlt = parseOptionalString(formData.get("coverAlt")) ?? title;
    const description = z.string().min(1, "描述必填。").parse(formData.get("description"));
    const videoUrl = parseOptionalString(formData.get("videoUrl"));
    const relatedProductId = parseOptionalString(formData.get("relatedProductId"));
    const relatedProductUrlInput = parseOptionalString(formData.get("relatedProductUrl"));
    const demoUrl = parseOptionalString(formData.get("demoUrl"));
    const relatedProduct = relatedProductId
      ? await prisma.tool.findUnique({
          where: { id: relatedProductId },
          select: { id: true, slug: true, name: true, englishName: true, type: true }
        })
      : null;
    const relatedProductUrl = relatedProduct
      ? buildCanonicalToolPath(relatedProduct, "zh")
      : relatedProductUrlInput;

    if (relatedProductId && !relatedProduct) {
      throw new Error("关联产品不存在，请重新选择。");
    }
    if (status === "published" && !videoUrl) {
      throw new Error("已发布状态必须上传本地视频。");
    }
    if (status === "published" && !relatedProductId && !relatedProductUrl && !demoUrl) {
      throw new Error("已发布状态必须有关联产品、关联产品链接或演示链接。");
    }

    const publishedAt = parseProductDemoDateField(formData.get("publishedAt")) ?? (status === "published" ? new Date() : null);
    const data = {
      title,
      slug,
      description,
      category,
      tags: parseTagNames(String(formData.get("tags") ?? "")),
      coverImage,
      coverAlt,
      videoUrl,
      videoDuration: parseOptionalString(formData.get("videoDuration")),
      uploadDate: parseProductDemoDateField(formData.get("uploadDate")),
      transcript: parseOptionalString(formData.get("transcript")),
      faq: parseProductDemoFaqRows(formData.get("faq")),
      productType: parseOptionalString(formData.get("productType")),
      relatedProductId,
      relatedProductSlug: relatedProduct?.slug ?? parseOptionalString(formData.get("relatedProductSlug")),
      relatedProductUrl,
      demoUrl,
      tutorialUrl: parseOptionalString(formData.get("tutorialUrl")),
      isFeaturedOnHome: parseBooleanField(formData.get("isFeaturedOnHome")),
      sortOrder: parseNumberField(formData.get("sortOrder"), 0),
      status,
      seoTitle: parseOptionalString(formData.get("seoTitle")),
      seoDescription: parseOptionalString(formData.get("seoDescription")),
      canonicalUrl: parseOptionalString(formData.get("canonicalUrl")),
      publishedAt
    };

    if (id) {
      await prisma.productDemo.update({ where: { id }, data });
      savedId = id;
    } else {
      const created = await prisma.productDemo.create({ data });
      savedId = created.id;
    }
    if (!savedId) throw new Error("产品演示保存失败。");

    await writeAdminAuditLog({
      adminId: admin.id,
      action: id ? "product_demo.update" : "product_demo.create",
      targetType: "product_demo",
      targetId: savedId,
      summary: id ? "Updated product demo." : "Created product demo.",
      metadata: { title, slug, status, isFeaturedOnHome: data.isFeaturedOnHome }
    });

    revalidateProductDemoPaths(slug);
    if (status === "published") {
      const urls = ["/product-demos", buildProductDemoPath(slug, "zh")];
      await notifyIndexNow(urls);
      await notifyBaiduSearch(urls, { source: "admin-product-demo-upsert", demoId: savedId });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存产品演示失败，请检查表单内容。";
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/product-demos/${savedId}?saved=1`);
}

export async function archiveProductDemoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const demo = await prisma.productDemo.update({
    where: { id },
    data: { status: "archived", isFeaturedOnHome: false },
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "product_demo.archive",
    targetType: "product_demo",
    targetId: id,
    summary: "Archived product demo.",
    metadata: { title: demo.title, slug: demo.slug }
  });

  revalidateProductDemoPaths(demo.slug);
  redirect("/admin/product-demos?archived=1");
}

export async function deleteProductDemoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const demo = await prisma.productDemo.delete({
    where: { id },
    select: { id: true, title: true, slug: true, status: true }
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "product_demo.delete",
    targetType: "product_demo",
    targetId: id,
    summary: "Deleted product demo.",
    metadata: { title: demo.title, slug: demo.slug, status: demo.status }
  });

  revalidateProductDemoPaths(demo.slug);
  redirect("/admin/product-demos?deleted=1");
}

async function resolveUniqueNewsTopicSlug(input: {
  title: string;
  slugInput?: string | null;
  fallbackSeed: string;
  id?: string | null;
}) {
  let slug = resolveNewsSlug(input);
  const baseSlug = slug;
  let retry = 0;

  while (
    await prisma.newsTopic.findFirst({
      where: { slug, ...(input.id ? { id: { not: input.id } } : {}) },
      select: { id: true }
    })
  ) {
    retry += 1;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    if (retry > 10) break;
  }

  return slug;
}

function revalidateAiNewsTopicPaths(slug: string) {
  revalidateTag("public-news");
  revalidateTag("public-ai-news-topics");
  revalidatePath("/admin/ai-news/topics");
  revalidatePath("/ai-news");
  revalidatePath("/en/ai-news");
  revalidatePath(`/ai-news/topics/${slug}`);
  revalidatePath(`/en/ai-news/topics/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function upsertNewsTopicAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const returnTo = parseOptionalString(formData.get("returnTo")) ?? "/admin/ai-news/topics";
  let savedId = id;

  try {
    const title = z.string().min(1).parse(formData.get("title"));
    const slug = await resolveUniqueNewsTopicSlug({
      title,
      slugInput: parseOptionalString(formData.get("slug")),
      fallbackSeed: id ?? Date.now().toString(36),
      id
    });
    const data = {
      slug,
      status: z.enum(["active", "disabled"]).parse(formData.get("status") ?? "active"),
      sortOrder: parseNumberField(formData.get("sortOrder"), 0),
      title,
      description: z.string().min(1).parse(formData.get("description")),
      intro: z.string().min(1).parse(formData.get("intro")),
      answer: z.string().min(1).parse(formData.get("answer")),
      searchQuery: z.string().min(1).parse(formData.get("searchQuery")),
      keywords: parseMultilineItems(formData.get("keywords")),
      whyItMatters: parseMultilineItems(formData.get("whyItMatters")),
      actionLinks: parseTopicJsonRows(formData.get("actionLinks"), "action"),
      faqs: parseTopicJsonRows(formData.get("faqs"), "faq"),
      sourceLinks: parseTopicJsonRows(formData.get("sourceLinks"), "source"),
      englishTitle: parseOptionalString(formData.get("englishTitle")),
      englishDescription: parseOptionalString(formData.get("englishDescription")),
      englishIntro: parseOptionalString(formData.get("englishIntro")),
      englishAnswer: parseOptionalString(formData.get("englishAnswer")),
      englishSearchQuery: parseOptionalString(formData.get("englishSearchQuery")),
      englishKeywords: parseMultilineItems(formData.get("englishKeywords")),
      englishWhyItMatters: parseMultilineItems(formData.get("englishWhyItMatters")),
      englishActionLinks: parseTopicJsonRows(formData.get("englishActionLinks"), "action"),
      englishFaqs: parseTopicJsonRows(formData.get("englishFaqs"), "faq")
    };

    const saved = id
      ? await prisma.newsTopic.update({ where: { id }, data })
      : await prisma.newsTopic.create({ data });
    savedId = saved.id;

    await writeAdminAuditLog({
      adminId: admin.id,
      action: id ? "news_topic.update" : "news_topic.create",
      targetType: "news_topic",
      targetId: saved.id,
      summary: id ? "Updated AI news topic." : "Created AI news topic.",
      metadata: { title, slug: saved.slug, status: saved.status }
    });

    revalidateAiNewsTopicPaths(saved.slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存 AI 资讯专题失败，请检查表单。";
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/ai-news/topics/${savedId}?saved=1`);
}

export async function deleteNewsTopicAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const topic = await prisma.newsTopic.delete({
    where: { id },
    select: { id: true, title: true, slug: true }
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "news_topic.delete",
    targetType: "news_topic",
    targetId: topic.id,
    summary: "Deleted AI news topic.",
    metadata: { title: topic.title, slug: topic.slug }
  });

  revalidateAiNewsTopicPaths(topic.slug);
  redirect("/admin/ai-news/topics?deleted=1");
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
