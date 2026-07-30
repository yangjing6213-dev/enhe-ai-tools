import { Prisma, type Order, type PaymentMethod, type PaymentTransaction, type Tool } from "@prisma/client";
import { createAdminAuditCreateData } from "@/lib/admin-audit";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { lockSoftwareEntitlement } from "@/lib/membership";
import { LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE } from "@/lib/refund-reconciliation";
import { grantSeoAuditEntitlementsForPaidOrderInTransaction } from "@/lib/seo-audit/entitlements";
import {
  assertZpayPaymentCreationAllowed,
  loadZpayConfig,
  type ZpayConfig,
} from "@/lib/zpay-config";
import {
  buildZpaySignedParams,
  formatZpayAmount,
  mapPaymentMethodToZpayType,
  mapZpayTypeToPaymentMethod,
  normalizeZpayItemName,
  truncateUtf8,
  verifyZpayNotifyPayload,
  type ZpayParams
} from "@/lib/zpay";

type AmountLike = { toString(): string };
type OrderForPaymentRequest = {
  id: string;
  orderNo: string;
  amount: AmountLike;
  paymentMethod?: PaymentMethod | null;
};
type OrderForNotifyValidation = {
  id: string;
  orderNo: string;
  amount: AmountLike;
};

type ZpayCreatePaymentResponse = {
  code?: number | string;
  msg?: string;
  O_id?: string;
  trade_no?: string;
  payurl?: string;
  payurl2?: string;
  qrcode?: string;
  img?: string;
};

type ZpayDatabase = typeof prisma;
type EnsureZpayPaymentDependencies = {
  db?: ZpayDatabase;
  config?: ZpayConfig;
  requestPayment?: typeof requestZpayPayment;
  now?: () => Date;
};

type ActivateZpayNotifyDependencies = {
  db?: ZpayDatabase;
  config?: ZpayConfig;
  now?: () => Date;
  trackEvent?: typeof trackAnalyticsEvent;
};

type ZpayRefundResponse = {
  code?: number | string;
  msg?: string;
  [key: string]: unknown;
};
type ZpayRefundPayload = {
  code: string;
  msg?: string;
};
export type ZpayRefundResult =
  | {
      kind: "succeeded" | "rejected";
      providerCode: string;
      message: string | null;
      payload: ZpayRefundPayload;
    }
  | {
      kind: "ambiguous";
      errorCode:
        | "invalid-config"
        | "timeout"
        | "network"
        | "redirect"
        | "http-error"
        | "response-too-large"
        | "invalid-json"
        | "invalid-response";
      detail: string | null;
    };
const zpayPaymentRequestVersion = "paid-download-v3";
export const zpayPaymentRequestTimeoutMs = 10_000;
export const zpayPaymentDispatchStaleAfterMs = 15 * 60 * 1_000;
const zpayRefundResponseMaxBytes = 16 * 1024;
const zpayRefundMessageMaxBytes = 256;
const zpayRefundTimeoutMs = 10_000;

export type ZpayNotifyValidationResult =
  | { ok: true; reason: null }
  | {
      ok: false;
      reason:
        | "invalid-signature"
        | "missing-signature"
        | "merchant-mismatch"
        | "order-mismatch"
        | "status-not-success"
        | "amount-mismatch";
    };

export type ZpayPaymentView = {
  transaction: PaymentTransaction;
  displayUrl: string | null;
  displayImageUrl: string | null;
  payUrl: string | null;
  qrcodeUrl: string | null;
  error?: string | null;
};

function toJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function zpayEndpoint(config: ZpayConfig, pathname: string) {
  return `${config.apiBase.replace(/\/+$/, "")}/${pathname.replace(/^\/+/, "")}`;
}

function isSuccessfulProviderCode(code: unknown) {
  return String(code) === "1";
}

function isPaidOrderStatus(status: Order["orderStatus"]) {
  return status === "paid" || status === "activated" || status === "refunded";
}

function buildPaidDownloadPaymentName(tool: Pick<Tool, "name" | "englishName" | "type">) {
  const baseName = tool.englishName?.trim() || tool.name;
  const conciseName = baseName.split(/[|｜]/)[0]?.trim() || baseName;
  const suffix = tool.type === "online" ? "服务授权" : "下载授权";
  return normalizeZpayItemName(`${conciseName} ${suffix}`);
}

function buildOrderPaymentName(order: {
  orderType: Order["orderType"];
  tool?: Pick<Tool, "name" | "englishName" | "type"> | null;
  seoAuditOffer?: { name: string } | null;
}) {
  if (order.orderType === "software_download" && order.tool) {
    return buildPaidDownloadPaymentName(order.tool);
  }
  if (
    (order.orderType === "seo_audit_credit" || order.orderType === "seo_audit_monitoring") &&
    order.seoAuditOffer
  ) {
    return normalizeZpayItemName(`${order.seoAuditOffer.name} SEO/GEO巡检`);
  }
  throw new Error("Unsupported ZPAY order type or missing product binding.");
}

function buildStoredZpayNotifyPayload(payload: ZpayParams) {
  const stored: Record<string, string> = {};
  for (const key of [
    "pid",
    "trade_no",
    "out_trade_no",
    "type",
    "money",
    "trade_status",
    "param",
  ] as const) {
    const value = payload[key];
    if (value === undefined || value === null) continue;
    stored[key] = truncateUtf8(String(value), 256);
  }
  return toJson(stored);
}

function getRawResponseObject(transaction: PaymentTransaction) {
  const raw = transaction.rawResponse;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

type ZpayPaymentCreationState = "dispatching" | "created" | "failed" | "ambiguous";
type ZpayPaymentRequestMetadata = {
  requestVersion: string;
  creationState: ZpayPaymentCreationState;
  requestType: string;
  requestOrderNo: string;
  requestAmount: string;
};

function buildZpayPaymentRequestMetadata(
  request: ReturnType<typeof buildZpayPaymentRequest>,
  creationState: ZpayPaymentCreationState,
): ZpayPaymentRequestMetadata {
  return {
    requestVersion: zpayPaymentRequestVersion,
    creationState,
    requestType: String(request.params.type),
    requestOrderNo: String(request.params.out_trade_no),
    requestAmount: formatZpayAmount(String(request.params.money)),
  };
}

function hasExactZpayPaymentRequestMetadata(
  transaction: PaymentTransaction,
  expected: ZpayPaymentRequestMetadata,
) {
  const rawResponse = getRawResponseObject(transaction);
  if (!rawResponse || Object.keys(rawResponse).length !== Object.keys(expected).length) return false;
  return Object.entries(expected).every(([key, value]) => rawResponse[key] === value);
}

function canReusePendingZpayPayment(
  transaction: PaymentTransaction,
  expectedAmount: PaymentTransaction["amount"],
  expectedMetadata: ZpayPaymentRequestMetadata,
) {
  return (
    transaction.provider === "zpay" &&
    transaction.status === "pending" &&
    Boolean(getZpayDisplayUrl(transaction)) &&
    transaction.amount.equals(expectedAmount) &&
    transaction.paymentType === expectedMetadata.requestType &&
    hasExactZpayPaymentRequestMetadata(transaction, expectedMetadata)
  );
}

type ZpayPaymentDispatchClaim = {
  orderId: string;
  placeholderId: string;
  amount: PaymentTransaction["amount"];
  paymentType: string;
  request: ReturnType<typeof buildZpayPaymentRequest>;
  dispatchMetadata: ZpayPaymentRequestMetadata;
};

function createZpayPaymentStatePersistError(cause?: unknown) {
  const error = new Error("ZPAY_PAYMENT_CREATION_STATE_PERSIST_FAILED") as Error & {
    cause?: unknown;
  };
  if (cause !== undefined) error.cause = cause;
  return error;
}

function isZpayPaymentStatePersistError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === "ZPAY_PAYMENT_CREATION_STATE_PERSIST_FAILED"
  );
}

async function persistZpayPaymentCreationState(
  db: ZpayDatabase,
  claim: ZpayPaymentDispatchClaim,
  creationState: "failed" | "ambiguous",
) {
  try {
    return await db.$transaction(async (tx) => {
      const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "orders"
        WHERE "id" = ${claim.orderId}
        FOR UPDATE
      `);
      if (lockedOrders.length !== 1) throw createZpayPaymentStatePersistError();

      const current = await tx.order.findUnique({
        where: { id: claim.orderId },
        include: { paymentTransaction: true },
      });
      const transaction = current?.paymentTransaction;
      if (!transaction) throw createZpayPaymentStatePersistError();
      if (transaction.status === "paid" || transaction.status === "refunded") {
        return { kind: "terminal" as const, transaction };
      }

      const nextMetadata = buildZpayPaymentRequestMetadata(claim.request, creationState);
      const updated = await tx.paymentTransaction.updateMany({
        where: {
          id: claim.placeholderId,
          orderId: claim.orderId,
          provider: "zpay",
          status: "pending",
          amount: claim.amount,
          paymentType: claim.paymentType,
          rawResponse: { equals: toJson(claim.dispatchMetadata) },
        },
        data: {
          status: creationState === "failed" ? "failed" : "pending",
          rawResponse: toJson(nextMetadata),
        },
      });
      if (updated.count !== 1) {
        const latest = await tx.paymentTransaction.findUnique({
          where: { id: claim.placeholderId },
        });
        if (latest?.status === "paid" || latest?.status === "refunded") {
          return { kind: "terminal" as const, transaction: latest };
        }
        throw createZpayPaymentStatePersistError();
      }
      return { kind: "persisted" as const };
    });
  } catch (error) {
    if (isZpayPaymentStatePersistError(error)) throw error;
    throw createZpayPaymentStatePersistError(error);
  }
}

export function buildZpayPaymentRequest(input: {
  config: ZpayConfig;
  order: OrderForPaymentRequest;
  itemName: string;
  clientIp: string;
}) {
  assertZpayPaymentCreationAllowed(input.config);
  const paymentType = mapPaymentMethodToZpayType(input.order.paymentMethod, input.config.defaultType);
  const itemName = normalizeZpayItemName(input.itemName);
  const params = buildZpaySignedParams(
    {
      pid: input.config.pid,
      cid: input.config.channelId,
      type: paymentType,
      out_trade_no: input.order.orderNo,
      notify_url: `${input.config.siteUrl}/api/zpay/notify`,
    return_url: `${input.config.siteUrl}/orders/${encodeURIComponent(input.order.id)}`,
      name: itemName,
      money: formatZpayAmount(input.order.amount.toString()),
      clientip: input.clientIp,
      param: input.order.id
    },
    input.config.key
  );

  return {
    endpoint: zpayEndpoint(input.config, "mapi.php"),
    params
  };
}

export function validateZpayNotifyForOrder(
  payload: ZpayParams,
  order: OrderForNotifyValidation,
  config: ZpayConfig
): ZpayNotifyValidationResult {
  const signature = verifyZpayNotifyPayload(payload, config.key);
  if (!signature.ok) return signature;
  if (String(payload.pid ?? "") !== config.pid) return { ok: false, reason: "merchant-mismatch" };
  if (String(payload.out_trade_no ?? "") !== order.orderNo) return { ok: false, reason: "order-mismatch" };
  if (String(payload.trade_status ?? "") !== "TRADE_SUCCESS") return { ok: false, reason: "status-not-success" };
  if (formatZpayAmount(String(payload.money ?? "0")) !== formatZpayAmount(order.amount.toString())) {
    return { ok: false, reason: "amount-mismatch" };
  }
  return { ok: true, reason: null };
}

async function postZpayForm<T extends Record<string, unknown>>(
  url: string,
  params: Record<string, string>,
  signal?: AbortSignal,
) {
  const body = new FormData();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "") body.append(key, value);
  }
  const response = await fetch(url, { method: "POST", body, signal });
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`ZPAY returned non-JSON response: ${text.slice(0, 160)}`);
  }
}

export async function requestZpayPayment(
  input: ReturnType<typeof buildZpayPaymentRequest>,
  options: { timeoutMs?: number } = {},
) {
  const requestedTimeout = options.timeoutMs ?? zpayPaymentRequestTimeoutMs;
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(1, Math.trunc(requestedTimeout))
    : zpayPaymentRequestTimeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await postZpayForm<ZpayCreatePaymentResponse>(
      input.endpoint,
      Object.fromEntries(Object.entries(input.params).map(([key, value]) => [key, String(value)])),
      controller.signal,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureZpayPaymentForOrder(
  input: { orderId: string; userId?: string; clientIp?: string },
  dependencies: EnsureZpayPaymentDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const config = dependencies.config ?? loadZpayConfig();
  assertZpayPaymentCreationAllowed(config);
  const claim = await db.$transaction(async (tx) => {
    const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "orders"
      WHERE "id" = ${input.orderId}
      FOR UPDATE
    `);
    if (lockedOrders.length !== 1) {
      throw new Error("Order does not exist or is not payable by ZPAY.");
    }

    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        ...(input.userId ? { userId: input.userId } : {}),
        orderType: { in: ["software_download", "seo_audit_credit", "seo_audit_monitoring"] },
      },
      include: { tool: true, seoAuditOffer: true, paymentTransaction: true },
    });
    if (!order) throw new Error("Order does not exist or is not payable by ZPAY.");

    const currentTransaction = order.paymentTransaction;
    if (isPaidOrderStatus(order.orderStatus)) {
      if (!currentTransaction) {
        throw new Error("ZPAY_ORDER_ALREADY_PAID_WITHOUT_TRANSACTION");
      }
      return { kind: "view" as const, transaction: currentTransaction };
    }

    const request = buildZpayPaymentRequest({
      config,
      order,
      itemName: buildOrderPaymentName(order),
      clientIp: input.clientIp ?? "127.0.0.1",
    });
    const dispatchMetadata = buildZpayPaymentRequestMetadata(request, "dispatching");
    const createdMetadata = buildZpayPaymentRequestMetadata(request, "created");
    const ambiguousMetadata = buildZpayPaymentRequestMetadata(request, "ambiguous");
    const requestType = dispatchMetadata.requestType;

    if (
      currentTransaction?.status === "paid" ||
      currentTransaction?.status === "refunded"
    ) {
      return { kind: "view" as const, transaction: currentTransaction };
    }
    if (currentTransaction?.status === "failed") {
      return { kind: "reconciliation_required" as const };
    }
    if (
      currentTransaction?.status === "pending" &&
      getRawResponseObject(currentTransaction)?.creationState === "ambiguous"
    ) {
      return { kind: "reconciliation_required" as const };
    }
    if (currentTransaction?.status === "pending" && getZpayDisplayUrl(currentTransaction)) {
      if (canReusePendingZpayPayment(currentTransaction, order.amount, createdMetadata)) {
        return { kind: "view" as const, transaction: currentTransaction };
      }
      throw new Error("ZPAY_PAYMENT_CREATION_REUSE_UNSAFE");
    }

    if (currentTransaction?.status === "pending") {
      const isMatchingDispatch =
        currentTransaction.provider === "zpay" &&
        currentTransaction.amount.equals(order.amount) &&
        currentTransaction.paymentType === requestType &&
        hasExactZpayPaymentRequestMetadata(currentTransaction, dispatchMetadata);
      if (!isMatchingDispatch) {
        return { kind: "reconciliation_required" as const };
      }

      const now = dependencies.now?.() ?? new Date();
      if (
        currentTransaction.updatedAt.getTime() >=
        now.getTime() - zpayPaymentDispatchStaleAfterMs
      ) {
        throw new Error("ZPAY_PAYMENT_CREATION_IN_PROGRESS");
      }

      const recovered = await tx.paymentTransaction.updateMany({
        where: {
          id: currentTransaction.id,
          orderId: order.id,
          provider: "zpay",
          status: "pending",
          amount: order.amount,
          paymentType: requestType,
          updatedAt: currentTransaction.updatedAt,
          rawResponse: { equals: toJson(dispatchMetadata) },
        },
        data: {
          rawResponse: toJson(ambiguousMetadata),
        },
      });
      if (recovered.count !== 1) {
        const latest = await tx.paymentTransaction.findUnique({
          where: { id: currentTransaction.id },
        });
        if (latest?.status === "paid" || latest?.status === "refunded") {
          return { kind: "view" as const, transaction: latest };
        }
        throw createZpayPaymentStatePersistError();
      }
      return { kind: "reconciliation_required" as const };
    }

    if (currentTransaction) return { kind: "reconciliation_required" as const };

    const placeholder = await tx.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: "zpay",
        paymentType: requestType,
        status: "pending",
        amount: order.amount,
        rawResponse: toJson(dispatchMetadata),
      },
    });

    return {
      kind: "dispatch" as const,
      orderId: order.id,
      placeholderId: placeholder.id,
      amount: placeholder.amount,
      paymentType: requestType,
      request,
      dispatchMetadata,
    };
  });

  if (claim.kind === "view") return toZpayPaymentView(claim.transaction);
  if (claim.kind === "reconciliation_required") {
    throw new Error("ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED");
  }

  let response: ZpayCreatePaymentResponse;
  try {
    response = await (dependencies.requestPayment ?? requestZpayPayment)(claim.request);
  } catch (error) {
    const persisted = await persistZpayPaymentCreationState(db, claim, "ambiguous");
    if (persisted.kind === "terminal") {
      return toZpayPaymentView(persisted.transaction);
    }
    throw error;
  }
  if (!isSuccessfulProviderCode(response.code)) {
    const providerError = new Error(response.msg || "ZPAY 创建支付订单失败。");
    const persisted = await persistZpayPaymentCreationState(db, claim, "failed");
    if (persisted.kind === "terminal") {
      return toZpayPaymentView(persisted.transaction);
    }
    throw providerError;
  }

  try {
    return await db.$transaction(async (tx) => {
      const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "orders"
        WHERE "id" = ${claim.orderId}
        FOR UPDATE
      `);
      if (lockedOrders.length !== 1) throw createZpayPaymentStatePersistError();
      const current = await tx.order.findUnique({
        where: { id: claim.orderId },
        include: { tool: true, seoAuditOffer: true, paymentTransaction: true },
      });
      const transaction = current?.paymentTransaction;
      if (!transaction) throw createZpayPaymentStatePersistError();
      if (transaction.status === "paid" || transaction.status === "refunded") {
        return toZpayPaymentView(transaction);
      }
      if (
        transaction.id !== claim.placeholderId ||
        transaction.status !== "pending" ||
        !transaction.amount.equals(claim.amount) ||
        transaction.paymentType !== claim.paymentType ||
        !hasExactZpayPaymentRequestMetadata(transaction, claim.dispatchMetadata)
      ) {
        throw createZpayPaymentStatePersistError();
      }

      const createdMetadata = buildZpayPaymentRequestMetadata(claim.request, "created");
      const updated = await tx.paymentTransaction.updateMany({
        where: {
          id: claim.placeholderId,
          orderId: claim.orderId,
          provider: "zpay",
          status: "pending",
          amount: claim.amount,
          paymentType: claim.paymentType,
          rawResponse: { equals: toJson(claim.dispatchMetadata) },
        },
        data: {
          providerTradeNo: response.trade_no ?? null,
          providerOrderId: response.O_id ?? null,
          qrCodeUrl: response.qrcode ?? null,
          qrImageUrl: response.img ?? null,
          payUrl: response.payurl ?? null,
          payUrl2: response.payurl2 ?? null,
          rawResponse: toJson(createdMetadata),
        },
      });
      if (updated.count !== 1) {
        const latest = await tx.paymentTransaction.findUnique({
          where: { id: claim.placeholderId },
        });
        if (latest?.status === "paid" || latest?.status === "refunded") {
          return toZpayPaymentView(latest);
        }
        throw createZpayPaymentStatePersistError();
      }

      return toZpayPaymentView(
        await tx.paymentTransaction.findUniqueOrThrow({ where: { id: claim.placeholderId } }),
      );
    });
  } catch (error) {
    if (isZpayPaymentStatePersistError(error)) throw error;
    throw createZpayPaymentStatePersistError(error);
  }
}

function getZpayDisplayUrl(transaction: PaymentTransaction) {
  return transaction.qrImageUrl ?? transaction.qrCodeUrl ?? transaction.payUrl ?? transaction.payUrl2;
}

export function toZpayPaymentView(transaction: PaymentTransaction): ZpayPaymentView {
  return {
    transaction,
    displayUrl: getZpayDisplayUrl(transaction),
    displayImageUrl: transaction.qrImageUrl,
    payUrl: transaction.payUrl ?? transaction.payUrl2,
    qrcodeUrl: transaction.qrCodeUrl
  };
}

export async function activateOrderFromZpayNotify(
  payload: ZpayParams,
  dependencies: ActivateZpayNotifyDependencies = {},
) {
  const db = dependencies.db ?? prisma;
  const config = dependencies.config ?? loadZpayConfig();
  const orderNo = String(payload.out_trade_no ?? "");
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { paymentTransaction: true }
  });
  if (!order) return { ok: false, response: "order-not-found", status: 404 };

  const validation = validateZpayNotifyForOrder(payload, order, config);
  if (!validation.ok) return { ok: false, response: validation.reason, status: 400 };
  if (
    (order.orderType === "software_download" && !order.toolId) ||
    (order.orderType !== "software_download" &&
      order.orderType !== "seo_audit_credit" &&
      order.orderType !== "seo_audit_monitoring")
  ) {
    return { ok: false, response: "unsupported-order-type", status: 400 };
  }

  const activationResult = await db.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`,
    );
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        paymentTransaction: true,
        refundRecords: {
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        },
      }
    });
    if (!current) throw new Error("Order disappeared during ZPAY callback.");
    const lockedValidation = validateZpayNotifyForOrder(payload, current, config);
    if (!lockedValidation.ok) {
      return { validationFailure: lockedValidation, purchaseEvents: [] };
    }
    if (current.orderType === "software_download") {
      if (!current.toolId) throw new Error("Software order is missing tool binding.");
      await lockSoftwareEntitlement(tx, current.userId, current.toolId);
    }
    if (
      current.paymentTransaction &&
      !current.paymentTransaction.amount.equals(current.amount)
    ) {
      throw new Error("PAYMENT_TRANSACTION_AMOUNT_MISMATCH");
    }

    const now = dependencies.now?.() ?? new Date();
    const isNewLatePaymentAfterLocalRefund =
      current.orderStatus === "refunded" && !current.paymentTransaction;
    let lateRefundRecordId: string | null = null;
    if (isNewLatePaymentAfterLocalRefund) {
      const existingPendingRefund = current.refundRecords.find(
        (refund) => refund.status === "pending",
      );
      const completedRefund = current.refundRecords.find(
        (refund) => refund.status === "completed",
      );
      if (existingPendingRefund) {
        lateRefundRecordId = existingPendingRefund.id;
      } else if (completedRefund) {
        lateRefundRecordId = completedRefund.id;
        await tx.orderRefundRecord.update({
          where: { id: completedRefund.id },
          data: { status: "pending", completedAt: null },
        });
      } else {
        const reconciliationRefund = await tx.orderRefundRecord.create({
          data: {
            orderId: current.id,
            amount: current.amount,
            status: "pending",
            reason: "Late ZPAY payment after locally refunded order requires reconciliation.",
          },
          select: { id: true },
        });
        lateRefundRecordId = reconciliationRefund.id;
      }
    }
    const isStoredLatePaymentReconciliation =
      current.paymentTransaction?.refundState === "ambiguous" &&
      current.paymentTransaction.refundLastErrorCode ===
        LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE;
    const requiresLatePaymentReconciliation =
      isNewLatePaymentAfterLocalRefund || isStoredLatePaymentReconciliation;
    const paidAt = isNewLatePaymentAfterLocalRefund
      ? now
      : current.paymentTransaction?.paidAt ?? current.paidAt ?? now;
    const wasActivated = current.orderStatus === "activated";
    const wasPaid =
      current.paymentTransaction?.status === "paid" &&
      (current.orderStatus === "paid" || wasActivated);
    await tx.paymentTransaction.upsert({
      where: { orderId: current.id },
      update: {
        provider: "zpay",
        providerTradeNo: String(payload.trade_no ?? current.paymentTransaction?.providerTradeNo ?? ""),
        paymentType: String(payload.type ?? current.paymentTransaction?.paymentType ?? "wxpay"),
        status: requiresLatePaymentReconciliation
          ? "paid"
          : current.orderStatus === "refunded"
            ? "refunded"
            : "paid",
        notifyPayload: buildStoredZpayNotifyPayload(payload),
        paidAt,
        ...(requiresLatePaymentReconciliation
          ? {
              refundState: "ambiguous" as const,
              refundRecordId:
                lateRefundRecordId ?? current.paymentTransaction?.refundRecordId ?? null,
              refundRequestedAt: current.paymentTransaction?.refundRequestedAt ?? now,
              refundLastErrorCode: LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE,
              refundLastErrorDetail: null,
              refundedAt: null,
            }
          : {}),
      },
      create: {
        orderId: current.id,
        provider: "zpay",
        providerTradeNo: String(payload.trade_no ?? ""),
        paymentType: String(payload.type ?? "wxpay"),
        status: requiresLatePaymentReconciliation
          ? "paid"
          : current.orderStatus === "refunded"
            ? "refunded"
            : "paid",
        amount: current.amount,
        notifyPayload: buildStoredZpayNotifyPayload(payload),
        paidAt,
        ...(requiresLatePaymentReconciliation
          ? {
              refundState: "ambiguous" as const,
              refundRecordId: lateRefundRecordId,
              refundRequestedAt: now,
              refundLastErrorCode: LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE,
            }
          : {}),
      }
    });

    if (isNewLatePaymentAfterLocalRefund) {
      await tx.adminAuditLog.create({
        data: createAdminAuditCreateData({
          action: "order.payment.zpay_late_after_refund",
          targetType: "order",
          targetId: current.id,
          summary: `Late ZPAY payment for locally refunded order ${current.orderNo} requires reconciliation.`,
          metadata: {
            refundId: lateRefundRecordId,
            paymentType: String(payload.type ?? ""),
            providerTradeNo: String(payload.trade_no ?? ""),
            refundState: "ambiguous",
            errorCode: LATE_PAYMENT_AFTER_LOCAL_REFUND_ERROR_CODE,
          },
        }),
      });
      return { validationFailure: null, purchaseEvents: [] };
    }
    if (current.orderStatus === "refunded") {
      return { validationFailure: null, purchaseEvents: [] };
    }
    if (current.orderStatus !== "paid" && !wasActivated) {
      await tx.order.update({
        where: { id: current.id },
        data: {
          orderStatus: "paid",
          paymentMethod: mapZpayTypeToPaymentMethod(String(payload.type ?? "")),
          paidAt
        }
      });
    }

    if (current.orderType === "software_download") {
      await tx.toolPurchase.upsert({
        where: { userId_toolId: { userId: current.userId, toolId: current.toolId! } },
        update: {
          orderId: current.id,
          amount: current.amount,
          toolPriceSpecId: current.toolPriceSpecId,
          toolPriceSpecName: current.toolPriceSpecName
        },
        create: {
          userId: current.userId,
          toolId: current.toolId!,
          orderId: current.id,
          toolPriceSpecId: current.toolPriceSpecId,
          toolPriceSpecName: current.toolPriceSpecName,
          amount: current.amount
        }
      });
    } else {
      await grantSeoAuditEntitlementsForPaidOrderInTransaction(tx, current.id, now);
    }

    if (!wasActivated) {
      await tx.order.update({
        where: { id: current.id },
        data: {
          orderStatus: "activated",
          paymentMethod: mapZpayTypeToPaymentMethod(String(payload.type ?? "")),
          paidAt,
          activatedAt: current.activatedAt ?? now
        }
      });
    }

    if (!wasPaid) {
      await tx.adminAuditLog.create({
        data: createAdminAuditCreateData({
          action: "order.payment.zpay_activated",
          targetType: "order",
          targetId: current.id,
          summary: `ZPAY payment activated order ${current.orderNo}.`,
          metadata: {
            orderType: current.orderType,
            paymentType: String(payload.type ?? ""),
            providerTradeNo: String(payload.trade_no ?? ""),
          },
        }),
      });
    }

    const purchaseEvents: Array<Parameters<typeof trackAnalyticsEvent>[0]> = [];
    if (
      !wasPaid &&
      !wasActivated &&
      !requiresLatePaymentReconciliation &&
      (current.orderType === "seo_audit_credit" ||
        current.orderType === "seo_audit_monitoring")
    ) {
      const event = {
        entityType: "order",
        entityId: current.id,
        userId: current.userId,
        metadata: {
          orderType: current.orderType,
          amount: current.amount.toString()
        },
        context: {
          orderId: current.id,
          ...(current.seoAuditOfferId ? { offerId: current.seoAuditOfferId } : {})
        }
      };
      purchaseEvents.push({ eventName: "seo_audit_purchased", ...event });
      if (current.orderType === "seo_audit_monitoring") {
        purchaseEvents.push({
          eventName: "seo_audit_monitoring_purchased",
          ...event
        });
      }
    }
    return { validationFailure: null, purchaseEvents };
  });
  if (activationResult.validationFailure) {
    return {
      ok: false,
      response: activationResult.validationFailure.reason,
      status: 400
    };
  }

  const trackEvent = dependencies.trackEvent ?? trackAnalyticsEvent;
  for (const event of activationResult.purchaseEvents) {
    try {
      await trackEvent(event);
    } catch {
      // Payment activation has already committed; analytics is best effort.
    }
  }

  return { ok: true, response: "success", status: 200 };
}

export async function requestZpayRefund(input: {
  orderNo: string;
  amount: string | number;
  config?: ZpayConfig;
  timeoutMs?: number;
}): Promise<ZpayRefundResult> {
  const config = input.config ?? loadZpayConfig();
  const endpoint = secureZpayRefundEndpoint(config);
  if (!endpoint) {
    return { kind: "ambiguous", errorCode: "invalid-config", detail: null };
  }

  const body = new FormData();
  body.append("pid", config.pid);
  body.append("key", config.key);
  body.append("out_trade_no", input.orderNo);
  body.append("money", formatZpayAmount(input.amount));

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(1, Math.trunc(input.timeoutMs ?? zpayRefundTimeoutMs))
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body,
      redirect: "error",
      signal: controller.signal
    });
    if (response.status >= 300 && response.status < 400) {
      return { kind: "ambiguous", errorCode: "redirect", detail: null };
    }
    if (!response.ok) {
      return { kind: "ambiguous", errorCode: "http-error", detail: String(response.status) };
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > zpayRefundResponseMaxBytes) {
      return { kind: "ambiguous", errorCode: "response-too-large", detail: null };
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > zpayRefundResponseMaxBytes) {
      return { kind: "ambiguous", errorCode: "response-too-large", detail: null };
    }

    let parsed: ZpayRefundResponse;
    try {
      parsed = JSON.parse(text) as ZpayRefundResponse;
    } catch {
      return { kind: "ambiguous", errorCode: "invalid-json", detail: null };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "ambiguous", errorCode: "invalid-response", detail: null };
    }

    const providerCode =
      typeof parsed.code === "string" || typeof parsed.code === "number"
        ? String(parsed.code).trim()
        : "";
    if (!providerCode) {
      return { kind: "ambiguous", errorCode: "invalid-response", detail: null };
    }
    const message =
      typeof parsed.msg === "string"
        ? truncateUtf8(parsed.msg.trim(), zpayRefundMessageMaxBytes) || null
        : null;
    const payload: ZpayRefundPayload = {
      code: providerCode,
      ...(message ? { msg: message } : {})
    };
    return {
      kind: isSuccessfulProviderCode(providerCode) ? "succeeded" : "rejected",
      providerCode,
      message,
      payload
    };
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return { kind: "ambiguous", errorCode: "timeout", detail: null };
    }
    return { kind: "ambiguous", errorCode: "network", detail: null };
  } finally {
    clearTimeout(timeout);
  }
}

function secureZpayRefundEndpoint(config: ZpayConfig) {
  try {
    const base = new URL(config.apiBase);
    if (
      base.protocol !== "https:" ||
      base.username ||
      base.password ||
      base.search ||
      base.hash ||
      (base.pathname !== "/" && base.pathname !== "")
    ) {
      return null;
    }
    return zpayEndpoint(config, "api.php?act=refund");
  } catch {
    return null;
  }
}

export function coerceZpayPayload(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries());
}

export function paymentMethodFromZpayType(type: string | null | undefined): PaymentMethod {
  return mapZpayTypeToPaymentMethod(type);
}
