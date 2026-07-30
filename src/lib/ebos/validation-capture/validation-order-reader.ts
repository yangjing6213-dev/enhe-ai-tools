import type {
  EbosValidationCaptureWarning,
  EbosValidationOrderRecord,
  EbosValidationOrderSummary
} from "./validation-capture-types";

type OrderModel = {
  findMany(args?: unknown): Promise<unknown[]>;
};

type ValidationOrderPrismaClient = {
  order?: OrderModel;
  orderRefundRecord?: OrderModel;
};

export async function readValidationOrders(options: {
  prismaClient?: ValidationOrderPrismaClient;
  periodStart?: string | Date;
  periodEnd?: string | Date;
} = {}): Promise<EbosValidationOrderSummary> {
  try {
    const client = options.prismaClient ?? await loadDefaultPrismaClient();
    if (!client.order?.findMany) {
      return emptyOrderSummary(false, [warning(
        "order_model_unavailable",
        "Order model is unavailable; validation orders cannot be captured automatically."
      )]);
    }

    const rawOrders = await client.order.findMany(buildOrderQuery(options));
    return summarizeValidationOrders(rawOrders.map(normalizeOrder));
  } catch (error) {
    return emptyOrderSummary(false, [warning(
      "order_query_failed",
      `Order query failed; continuing without automatic order data. ${safeErrorMessage(error)}`
    )]);
  }
}

export function summarizeValidationOrders(orders: EbosValidationOrderRecord[]): EbosValidationOrderSummary {
  const ordersByProductOrSlug: EbosValidationOrderSummary["ordersByProductOrSlug"] = {};
  const warnings: EbosValidationCaptureWarning[] = [];

  for (const order of orders) {
    const key = attributionKey(order);
    if (!key) {
      warnings.push(warning(
        "order_attribution_unknown",
        `Order ${order.id} could not be attributed to AI Prompt Kit, FaceSwap Studio, or AI Video Studio.`
      ));
      continue;
    }
    const current = ordersByProductOrSlug[key] ?? {
      totalOrders: 0,
      paidOrders: 0,
      revenue: 0,
      refundedAmount: 0,
      refundCount: 0,
      pendingRefundOrders: 0,
      undeliveredPaidOrders: 0
    };
    current.totalOrders += 1;
    if (isCountablePurchase(order)) {
      current.paidOrders += 1;
      current.revenue = round(current.revenue + order.amount);
    }
    if (order.isTestData !== true) {
      current.refundedAmount = round(current.refundedAmount + order.refundedAmount);
      current.refundCount += order.refundCount;
      current.pendingRefundOrders = (current.pendingRefundOrders ?? 0) + (hasPendingRefund(order) ? 1 : 0);
      current.undeliveredPaidOrders = (current.undeliveredPaidOrders ?? 0) + (isUndeliveredPaidOrder(order) ? 1 : 0);
    }
    ordersByProductOrSlug[key] = current;
  }

  return {
    ordersAvailable: true,
    totalOrders: orders.length,
    paidOrders: orders.filter(isCountablePurchase).length,
    revenue: round(orders.filter(isCountablePurchase).reduce((total, order) => total + order.amount, 0)),
    refundedAmount: round(orders
      .filter((order) => order.isTestData !== true)
      .reduce((total, order) => total + order.refundedAmount, 0)),
    refundCount: orders
      .filter((order) => order.isTestData !== true)
      .reduce((total, order) => total + order.refundCount, 0),
    pendingRefundOrders: orders.filter((order) => order.isTestData !== true && hasPendingRefund(order)).length,
    undeliveredPaidOrders: orders.filter(isUndeliveredPaidOrder).length,
    testOrdersExcluded: orders.filter((order) => order.isTestData === true).length,
    ordersByProductOrSlug,
    warnings: [
      warning("currency_inferred", "Currency inferred as CNY because no explicit currency field was detected."),
      ...warnings
    ]
  };
}

export function mapOrdersToValidationPlans(orders: EbosValidationOrderRecord[]) {
  const summary = summarizeValidationOrders(orders);
  return mapOrderSummaryToValidationPlans(summary);
}

export function mapOrderSummaryToValidationPlans(summary: EbosValidationOrderSummary) {
  const mapped: Record<string, {
    paidOrders: number;
    revenue: number;
    refundCount: number;
    refundedAmount: number;
    pendingRefundOrders: number;
    undeliveredPaidOrders: number;
  }> = {};

  for (const [key, productSummary] of Object.entries(summary.ordersByProductOrSlug)) {
    const planId = planIdFromProductKey(key);
    if (!planId) continue;
    const current = mapped[planId] ?? {
      paidOrders: 0,
      revenue: 0,
      refundCount: 0,
      refundedAmount: 0,
      pendingRefundOrders: 0,
      undeliveredPaidOrders: 0
    };
    current.paidOrders += productSummary.paidOrders;
    current.revenue = round(current.revenue + productSummary.revenue);
    current.refundCount += productSummary.refundCount;
    current.refundedAmount = round(current.refundedAmount + productSummary.refundedAmount);
    current.pendingRefundOrders += productSummary.pendingRefundOrders ?? 0;
    current.undeliveredPaidOrders += productSummary.undeliveredPaidOrders ?? 0;
    mapped[planId] = current;
  }

  return mapped;
}

export function planIdFromProductKey(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("ai-prompt-kit") || normalized.includes("prompt kit")) {
    return "validation-direction-3-ai-prompt-kit";
  }
  if (normalized.includes("faceswap") || normalized.includes("face swap")) {
    return "validation-product-1-faceswap-studio-ai";
  }
  if (normalized.includes("ai-video") || normalized.includes("ai video") || normalized.includes("local-ai-video-studio")) {
    return "validation-product-2-local-ai-video-studio-for-creator-workflows";
  }
  if (normalized.includes("seo-audit") || normalized.includes("seo/geo") || normalized.includes("seo geo")) {
    return "validation-product-seo-geo-audit";
  }
  return null;
}

function buildOrderQuery(options: { periodStart?: string | Date; periodEnd?: string | Date }) {
  const createdAt: Record<string, Date> = {};
  if (options.periodStart) createdAt.gte = toDate(options.periodStart);
  if (options.periodEnd) createdAt.lte = toDate(options.periodEnd);
  return {
    where: Object.keys(createdAt).length ? { createdAt } : undefined,
    include: {
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          englishName: true
        }
      },
      refundRecords: {
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          completedAt: true
        }
      },
      paymentTransaction: {
        select: { status: true, paidAt: true }
      },
      paymentProof: {
        select: { reviewStatus: true }
      },
      seoAuditOffer: {
        select: { code: true, name: true }
      }
    }
  };
}

async function loadDefaultPrismaClient(): Promise<ValidationOrderPrismaClient> {
  const mod = await import("@/lib/db");
  return mod.prisma as unknown as ValidationOrderPrismaClient;
}

function normalizeOrder(value: unknown): EbosValidationOrderRecord {
  const row = toRecord(value);
  const tool = toRecord(row.tool);
  const seoAuditOffer = toRecord(row.seoAuditOffer);
  const paymentTransaction = toRecord(row.paymentTransaction);
  const paymentProof = toRecord(row.paymentProof);
  const refunds = Array.isArray(row.refundRecords) ? row.refundRecords.map(toRecord) : [];
  const completedRefunds = refunds.filter((refund) => readString(refund.status) === "completed");
  const pendingRefunds = refunds.filter((refund) => readString(refund.status) === "pending");
  const hasDetailedRefunds = refunds.length > 0;
  const status = readString(row.status) ?? readString(row.orderStatus);
  const paidAt = toIso(row.paidAt) ?? toIso(paymentTransaction.paidAt);
  const activatedAt = toIso(row.activatedAt);
  const paymentSucceeded = readString(paymentTransaction.status) === "paid"
    || readString(paymentProof.reviewStatus) === "approved"
    || (status === "activated" && Boolean(paidAt));

  return {
    id: readString(row.id) ?? "unknown-order",
    productSlug: readString(row.productSlug) ?? readString(tool.slug) ?? readString(seoAuditOffer.code),
    productName: readString(row.productName) ?? readString(tool.name) ?? readString(tool.englishName) ?? readString(seoAuditOffer.name),
    productId: readString(row.productId) ?? readString(row.toolId) ?? readString(tool.id),
    amount: readMoney(row.amount),
    status,
    paidAt,
    createdAt: toIso(row.createdAt),
    isTestData: row.isTestData === true,
    paymentSucceeded,
    delivered: status === "activated" && Boolean(activatedAt),
    refundCount: hasDetailedRefunds
      ? completedRefunds.length
      : typeof row.refundCount === "number" ? row.refundCount : 0,
    pendingRefundCount: hasDetailedRefunds
      ? pendingRefunds.length
      : typeof row.pendingRefundCount === "number" ? row.pendingRefundCount : 0,
    refundedAmount: hasDetailedRefunds
      ? round(completedRefunds.reduce((total, refund) => total + readMoney(refund.amount), 0))
      : typeof row.refundedAmount === "number" ? row.refundedAmount : 0
  };
}

function attributionKey(order: EbosValidationOrderRecord) {
  const joined = [order.productSlug, order.productName, order.productId].filter(Boolean).join(" ");
  const planId = planIdFromProductKey(joined);
  if (!planId) return null;
  return order.productSlug ?? order.productName ?? planId;
}

function isCountablePurchase(order: EbosValidationOrderRecord) {
  return order.isTestData !== true
    && paymentSucceeded(order)
    && delivered(order)
    && order.status !== "refunded"
    && order.refundCount === 0
    && !hasPendingRefund(order);
}

function isUndeliveredPaidOrder(order: EbosValidationOrderRecord) {
  return order.isTestData !== true
    && paymentSucceeded(order)
    && !delivered(order)
    && order.status !== "refunded"
    && order.refundCount === 0;
}

function paymentSucceeded(order: EbosValidationOrderRecord) {
  return order.paymentSucceeded ?? (order.status === "paid" || order.status === "activated" || order.status === "refunded");
}

function delivered(order: EbosValidationOrderRecord) {
  return order.delivered ?? (order.status === "activated" || order.status === "refunded");
}

function hasPendingRefund(order: EbosValidationOrderRecord) {
  return (order.pendingRefundCount ?? 0) > 0;
}

function emptyOrderSummary(ordersAvailable: boolean, warnings: EbosValidationCaptureWarning[]): EbosValidationOrderSummary {
  return {
    ordersAvailable,
    totalOrders: 0,
    paidOrders: 0,
    revenue: 0,
    refundedAmount: 0,
    refundCount: 0,
    pendingRefundOrders: 0,
    undeliveredPaidOrders: 0,
    testOrdersExcluded: 0,
    ordersByProductOrSlug: {},
    warnings
  };
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return Number(value.toString()) || 0;
  }
  return 0;
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function warning(code: string, message: string): EbosValidationCaptureWarning {
  return { code, severity: "warning", message, source: "internal_database" };
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

