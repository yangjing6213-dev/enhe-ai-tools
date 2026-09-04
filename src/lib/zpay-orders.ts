import type { Order, PaymentMethod, PaymentTransaction, Prisma, Tool } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createOrderNo } from "@/lib/order";
import { loadZpayConfig, type ZpayConfig } from "@/lib/zpay-config";
import {
  buildZpaySignedParams,
  formatZpayAmount,
  mapPaymentMethodToZpayType,
  mapZpayTypeToPaymentMethod,
  normalizeZpayItemName,
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

type ZpayRefundResponse = {
  code?: number | string;
  msg?: string;
  [key: string]: unknown;
};
const zpayPaymentRequestVersion = "paid-download-v3";

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

function getRawResponseObject(transaction: PaymentTransaction) {
  const raw = transaction.rawResponse;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function canReusePendingZpayPayment(transaction: PaymentTransaction) {
  if (transaction.status !== "pending" || !getZpayDisplayUrl(transaction)) return false;
  return getRawResponseObject(transaction)?.requestVersion === zpayPaymentRequestVersion;
}

export function buildZpayPaymentRequest(input: {
  config: ZpayConfig;
  order: OrderForPaymentRequest;
  itemName: string;
  clientIp: string;
}) {
  const paymentType = mapPaymentMethodToZpayType(input.order.paymentMethod, input.config.defaultType);
  const itemName = normalizeZpayItemName(input.itemName);
  const params = buildZpaySignedParams(
    {
      pid: input.config.pid,
      cid: input.config.channelId,
      type: paymentType,
      out_trade_no: input.order.orderNo,
      notify_url: `${input.config.siteUrl}/api/zpay/notify`,
      return_url: `${input.config.siteUrl}/login?payment=success`,
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

function buildStoredZpayResponse(response: ZpayCreatePaymentResponse, request: ReturnType<typeof buildZpayPaymentRequest>) {
  return {
    ...response,
    requestVersion: zpayPaymentRequestVersion,
    requestName: request.params.name,
    requestNameBytes: Buffer.byteLength(String(request.params.name), "utf8"),
    requestType: request.params.type,
    requestOrderNo: request.params.out_trade_no
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

async function postZpayForm<T extends Record<string, unknown>>(url: string, params: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "") body.append(key, value);
  }
  const response = await fetch(url, { method: "POST", body });
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`ZPAY returned non-JSON response: ${text.slice(0, 160)}`);
  }
}

export async function requestZpayPayment(input: ReturnType<typeof buildZpayPaymentRequest>) {
  return postZpayForm<ZpayCreatePaymentResponse>(
    input.endpoint,
    Object.fromEntries(Object.entries(input.params).map(([key, value]) => [key, String(value)]))
  );
}

export async function ensureZpayPaymentForOrder(input: { orderId: string; userId?: string; clientIp?: string }) {
  const config = loadZpayConfig();
  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      ...(input.userId ? { userId: input.userId } : {}),
      orderType: "software_download"
    },
    include: { tool: true, paymentTransaction: true }
  });
  if (!order) throw new Error("订单不存在。");
  if (!order.tool) throw new Error("订单未关联工具或服务。");

  if (order.paymentTransaction && canReusePendingZpayPayment(order.paymentTransaction)) {
    return toZpayPaymentView(order.paymentTransaction);
  }

  if (isPaidOrderStatus(order.orderStatus) && order.paymentTransaction) {
    return toZpayPaymentView(order.paymentTransaction);
  }

  let payableOrder = order;
  if (order.paymentTransaction?.status === "pending") {
    await prisma.paymentTransaction.delete({ where: { orderId: order.id } });
    payableOrder = await prisma.order.update({
      where: { id: order.id },
      data: { orderNo: createOrderNo() },
      include: { tool: true, paymentTransaction: true }
    });
  }

  const request = buildZpayPaymentRequest({
    config,
    order: payableOrder,
    itemName: buildPaidDownloadPaymentName(payableOrder.tool!),
    clientIp: input.clientIp ?? "127.0.0.1"
  });
  const response = await requestZpayPayment(request);
  if (!isSuccessfulProviderCode(response.code)) {
    throw new Error(response.msg || "ZPAY 创建支付订单失败。");
  }

  const rawResponse = buildStoredZpayResponse(response, request);
  const transaction = await prisma.paymentTransaction.upsert({
    where: { orderId: payableOrder.id },
    update: {
      provider: "zpay",
      providerTradeNo: response.trade_no ?? null,
      providerOrderId: response.O_id ?? null,
      paymentType: request.params.type,
      status: "pending",
      amount: order.amount,
      qrCodeUrl: response.qrcode ?? null,
      qrImageUrl: response.img ?? null,
      payUrl: response.payurl ?? null,
      payUrl2: response.payurl2 ?? null,
      rawResponse: toJson(rawResponse as Record<string, unknown>)
    },
    create: {
      orderId: payableOrder.id,
      provider: "zpay",
      providerTradeNo: response.trade_no ?? null,
      providerOrderId: response.O_id ?? null,
      paymentType: request.params.type,
      status: "pending",
      amount: order.amount,
      qrCodeUrl: response.qrcode ?? null,
      qrImageUrl: response.img ?? null,
      payUrl: response.payurl ?? null,
      payUrl2: response.payurl2 ?? null,
      rawResponse: toJson(rawResponse as Record<string, unknown>)
    }
  });

  return toZpayPaymentView(transaction);
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

export async function activateOrderFromZpayNotify(payload: ZpayParams) {
  const config = loadZpayConfig();
  const orderNo = String(payload.out_trade_no ?? "");
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { paymentTransaction: true }
  });
  if (!order) return { ok: false, response: "order-not-found", status: 404 };

  const validation = validateZpayNotifyForOrder(payload, order, config);
  if (!validation.ok) return { ok: false, response: validation.reason, status: 400 };
  if (order.orderType !== "software_download" || !order.toolId) {
    return { ok: false, response: "unsupported-order-type", status: 400 };
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: { paymentTransaction: true }
    });
    if (!current) throw new Error("Order disappeared during ZPAY callback.");

    const now = new Date();
    await tx.paymentTransaction.upsert({
      where: { orderId: current.id },
      update: {
        provider: "zpay",
        providerTradeNo: String(payload.trade_no ?? current.paymentTransaction?.providerTradeNo ?? ""),
        paymentType: String(payload.type ?? current.paymentTransaction?.paymentType ?? "wxpay"),
        status: current.orderStatus === "refunded" ? "refunded" : "paid",
        notifyPayload: toJson(payload as Record<string, unknown>),
        paidAt: current.paymentTransaction?.paidAt ?? now
      },
      create: {
        orderId: current.id,
        provider: "zpay",
        providerTradeNo: String(payload.trade_no ?? ""),
        paymentType: String(payload.type ?? "wxpay"),
        status: current.orderStatus === "refunded" ? "refunded" : "paid",
        amount: current.amount,
        notifyPayload: toJson(payload as Record<string, unknown>),
        paidAt: now
      }
    });

    if (current.orderStatus === "refunded") return;
    if (!isPaidOrderStatus(current.orderStatus)) {
      await tx.order.update({
        where: { id: current.id },
        data: {
          orderStatus: "activated",
          paymentMethod: mapZpayTypeToPaymentMethod(String(payload.type ?? "")),
          paidAt: current.paidAt ?? now,
          activatedAt: current.activatedAt ?? now
        }
      });
    }

    await tx.toolPurchase.upsert({
      where: { orderId: current.id },
      update: {
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
  });

  return { ok: true, response: "success", status: 200 };
}

export async function requestZpayRefund(input: {
  orderNo: string;
  amount: string | number;
  config?: ZpayConfig;
}) {
  const config = input.config ?? loadZpayConfig();
  return postZpayForm<ZpayRefundResponse>(zpayEndpoint(config, "api.php?act=refund"), {
    pid: config.pid,
    key: config.key,
    out_trade_no: input.orderNo,
    money: formatZpayAmount(input.amount)
  });
}

export async function refundZpayTransactionForOrder(input: {
  order: Pick<Order, "orderNo"> & { amount: AmountLike; paymentTransaction?: PaymentTransaction | null };
}) {
  if (input.order.paymentTransaction?.provider !== "zpay") {
    return { skipped: true, response: null as ZpayRefundResponse | null };
  }
  if (input.order.paymentTransaction.status === "refunded") {
    return { skipped: false, response: { code: 1, msg: "ZPAY refund already recorded locally." } };
  }
  const response = await requestZpayRefund({
    orderNo: input.order.orderNo,
    amount: input.order.amount.toString()
  });
  if (!isSuccessfulProviderCode(response.code)) {
    throw new Error(response.msg || "ZPAY 退款失败。");
  }
  return { skipped: false, response };
}

export function coerceZpayPayload(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries());
}

export function paymentMethodFromZpayType(type: string | null | undefined): PaymentMethod {
  return mapZpayTypeToPaymentMethod(type);
}
