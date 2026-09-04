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
      refundCount: 0
    };
    current.totalOrders += 1;
    if (isPaidStatus(order.status)) {
      current.paidOrders += 1;
      current.revenue = round(current.revenue + order.amount);
    }
    current.refundedAmount = round(current.refundedAmount + order.refundedAmount);
    current.refundCount += order.refundCount;
    ordersByProductOrSlug[key] = current;
  }

  return {
    ordersAvailable: true,
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => isPaidStatus(order.status)).length,
    revenue: round(orders.filter((order) => isPaidStatus(order.status)).reduce((total, order) => total + order.amount, 0)),
    refundedAmount: round(orders.reduce((total, order) => total + order.refundedAmount, 0)),
    refundCount: orders.reduce((total, order) => total + order.refundCount, 0),
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
  const mapped: Record<string, { paidOrders: number; revenue: number; refundCount: number; refundedAmount: number }> = {};

  for (const [key, productSummary] of Object.entries(summary.ordersByProductOrSlug)) {
    const planId = planIdFromProductKey(key);
    if (!planId) continue;
    const current = mapped[planId] ?? { paidOrders: 0, revenue: 0, refundCount: 0, refundedAmount: 0 };
    current.paidOrders += productSummary.paidOrders;
    current.revenue = round(current.revenue + productSummary.revenue);
    current.refundCount += productSummary.refundCount;
    current.refundedAmount = round(current.refundedAmount + productSummary.refundedAmount);
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
  const refunds = Array.isArray(row.refundRecords) ? row.refundRecords.map(toRecord) : [];
  const activeRefunds = refunds.filter((refund) => readString(refund.status) !== "rejected");

  return {
    id: readString(row.id) ?? "unknown-order",
    productSlug: readString(row.productSlug) ?? readString(tool.slug),
    productName: readString(row.productName) ?? readString(tool.name) ?? readString(tool.englishName),
    productId: readString(row.productId) ?? readString(row.toolId) ?? readString(tool.id),
    amount: readMoney(row.amount),
    status: readString(row.status) ?? readString(row.orderStatus),
    paidAt: toIso(row.paidAt),
    createdAt: toIso(row.createdAt),
    refundCount: typeof row.refundCount === "number" ? row.refundCount : activeRefunds.length,
    refundedAmount: typeof row.refundedAmount === "number"
      ? row.refundedAmount
      : round(activeRefunds.reduce((total, refund) => total + readMoney(refund.amount), 0))
  };
}

function attributionKey(order: EbosValidationOrderRecord) {
  const joined = [order.productSlug, order.productName, order.productId].filter(Boolean).join(" ");
  const planId = planIdFromProductKey(joined);
  if (!planId) return null;
  return order.productSlug ?? order.productName ?? planId;
}

function isPaidStatus(status: string | undefined) {
  return status === "paid" || status === "activated" || status === "refunded";
}

function emptyOrderSummary(ordersAvailable: boolean, warnings: EbosValidationCaptureWarning[]): EbosValidationOrderSummary {
  return {
    ordersAvailable,
    totalOrders: 0,
    paidOrders: 0,
    revenue: 0,
    refundedAmount: 0,
    refundCount: 0,
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

