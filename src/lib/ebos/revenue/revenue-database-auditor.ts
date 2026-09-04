import type { EbosEvidenceWarning } from "../evidence";
import type {
  AuditRevenueDatabaseOptions,
  EbosOrderSummary,
  EbosRefundSummary,
  EbosRevenueDatabaseAuditResult,
  EbosRevenueDatabaseClient,
  EbosRevenueDatabaseSummary,
  EbosRevenueOrderRecord,
  EbosRevenueProductRecord,
  EbosRevenueRefundRecord,
  EbosRevenueSummary
} from "./revenue-evidence-types";

const ORDER_FIELDS = ["id", "orderNo", "toolId", "toolPriceSpecId", "amount", "orderStatus", "paidAt", "createdAt"];
const REFUND_FIELDS = ["id", "orderId", "amount", "status", "createdAt", "completedAt"];
const PRODUCT_FIELDS = ["id", "slug", "name", "englishName", "isDownloadPaid", "downloadPrice", "downloadFileId", "onlineUrl", "priceSpecs", "faqs"];
const ATTRIBUTION_FIELDS = ["toolId", "tool.id", "tool.slug", "tool.name"];

export async function auditRevenueDatabase(
  options: AuditRevenueDatabaseOptions = {}
): Promise<EbosRevenueDatabaseAuditResult> {
  const warnings: EbosEvidenceWarning[] = [];
  const periodStart = options.periodStart ? toDate(options.periodStart) : undefined;
  const periodEnd = options.periodEnd ? endOfDay(toDate(options.periodEnd)) : undefined;

  try {
    const client = options.prismaClient ?? await loadDefaultPrismaClient();
    if (!client.order?.findMany) throw new Error("Order model is unavailable.");

    const rawOrders = await client.order.findMany(orderQueryArgs());
    const rawRefunds = client.orderRefundRecord?.findMany
      ? await safeFindMany(client.orderRefundRecord, refundQueryArgs(), warnings, "refund_model_unavailable", "OrderRefundRecord query unavailable.")
      : [];
    const rawProducts = client.tool?.findMany
      ? await safeFindMany(client.tool, productQueryArgs(), warnings, "product_model_unavailable", "Tool query unavailable.")
      : [];

    const fieldWarnings = buildFieldWarnings(rawOrders);
    warnings.push(...fieldWarnings);
    warnings.push(warning(
      "currency_inferred",
      "Currency inferred as CNY because no explicit currency field was detected.",
      "internal_database"
    ));

    const orders = rawOrders.map(normalizeOrder);
    const refunds = normalizeRefunds(rawRefunds, rawOrders);
    const products = rawProducts.map(normalizeProduct);
    const refundedAmount = sum(refunds.filter((refund) => refund.status !== "rejected").map((refund) => refund.amount));
    const orderSummary = summarizeOrders(orders, periodStart, periodEnd);
    const refundSummary = summarizeRefunds(refunds, refundedAmount, grossRevenue(orders), periodStart, periodEnd);
    const revenueSummary = summarizeRevenue(orders, refundedAmount);

    return {
      currency: "CNY",
      revenueSummary,
      orderSummary,
      refundSummary,
      databaseSummary: buildDatabaseSummary({
        hasOrderModel: true,
        hasRefundModel: Boolean(client.orderRefundRecord?.findMany),
        hasProductModel: Boolean(client.tool?.findMany),
        unsupportedFields: fieldWarnings.map((item) => item.source).filter((source): source is string => Boolean(source)),
        warnings: warnings.map((item) => item.message)
      }),
      orders,
      refunds,
      products,
      warnings
    };
  } catch (error) {
    const dbWarning = warning(
      "database_unavailable",
      `Revenue database query unavailable; generating zero revenue evidence. ${errorMessage(error)}`,
      "internal_database"
    );
    return {
      currency: "CNY",
      revenueSummary: emptyRevenueSummary(),
      orderSummary: emptyOrderSummary(),
      refundSummary: emptyRefundSummary(),
      databaseSummary: buildDatabaseSummary({
        hasOrderModel: false,
        hasRefundModel: false,
        hasProductModel: false,
        unsupportedFields: [],
        warnings: [dbWarning.message]
      }),
      orders: [],
      refunds: [],
      products: [],
      warnings: [dbWarning]
    };
  }
}

async function loadDefaultPrismaClient(): Promise<EbosRevenueDatabaseClient> {
  const mod = await import("@/lib/db");
  return mod.prisma as unknown as EbosRevenueDatabaseClient;
}

async function safeFindMany(
  model: { findMany(args?: unknown): Promise<unknown[]> },
  args: unknown,
  warnings: EbosEvidenceWarning[],
  code: string,
  message: string
) {
  try {
    return await model.findMany(args);
  } catch (error) {
    warnings.push(warning(code, `${message} ${errorMessage(error)}`, "internal_database"));
    return [];
  }
}

function orderQueryArgs() {
  return {
    include: {
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          englishName: true,
          isDownloadPaid: true,
          downloadPrice: true,
          downloadFileId: true,
          onlineUrl: true,
          priceSpecs: { select: { id: true } },
          faqs: { select: { id: true, status: true } }
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
        select: {
          status: true,
          amount: true,
          paidAt: true,
          refundedAt: true
        }
      },
      paymentProof: {
        select: {
          reviewStatus: true,
          paymentMethod: true
        }
      }
    }
  };
}

function refundQueryArgs() {
  return {
    select: {
      id: true,
      orderId: true,
      amount: true,
      status: true,
      createdAt: true,
      completedAt: true
    }
  };
}

function productQueryArgs() {
  return {
    select: {
      id: true,
      slug: true,
      name: true,
      englishName: true,
      isDownloadPaid: true,
      downloadPrice: true,
      downloadFileId: true,
      onlineUrl: true,
      priceSpecs: { select: { id: true } },
      faqs: { select: { id: true, status: true } }
    }
  };
}

function normalizeOrder(value: unknown): EbosRevenueOrderRecord {
  const row = asRecord(value) ?? {};
  const tool = asRecord(row.tool);
  const refundRecords = arrayFrom(row.refundRecords);

  return {
    id: readString(row.id) ?? "unknown-order",
    orderNo: readString(row.orderNo),
    toolId: readString(row.toolId) ?? readString(tool?.id),
    productId: readString(row.toolId) ?? readString(tool?.id),
    productSlug: readString(tool?.slug),
    productName: readString(tool?.name) ?? readString(tool?.englishName),
    amount: readMoney(row.amount),
    status: readString(row.orderStatus) ?? readString(row.status),
    orderType: readString(row.orderType),
    paidAt: toIso(row.paidAt),
    createdAt: toIso(row.createdAt),
    refundedAmount: sum(refundRecords.map((refund) => readMoney(asRecord(refund)?.amount)))
  };
}

function normalizeRefunds(rawRefunds: unknown[], rawOrders: unknown[]): EbosRevenueRefundRecord[] {
  const directRefunds = rawRefunds.map(normalizeRefund);
  if (directRefunds.length > 0) return directRefunds;

  return rawOrders.flatMap((order) => {
    const row = asRecord(order) ?? {};
    return arrayFrom(row.refundRecords).map((refund) => normalizeRefund({
      ...asRecord(refund),
      orderId: row.id
    }));
  });
}

function normalizeRefund(value: unknown): EbosRevenueRefundRecord {
  const row = asRecord(value) ?? {};
  return {
    id: readString(row.id) ?? "unknown-refund",
    orderId: readString(row.orderId),
    amount: readMoney(row.amount),
    status: readString(row.status),
    createdAt: toIso(row.createdAt),
    completedAt: toIso(row.completedAt)
  };
}

function normalizeProduct(value: unknown): EbosRevenueProductRecord {
  const row = asRecord(value) ?? {};
  return {
    productId: readString(row.id),
    productSlug: readString(row.slug),
    productName: readString(row.name) ?? readString(row.englishName),
    hasPriceConfigured: hasPrice(row),
    hasDownloadConfigured: hasDownload(row),
    hasFaqConfigured: arrayFrom(row.faqs).length > 0
  };
}

function summarizeOrders(
  orders: EbosRevenueOrderRecord[],
  periodStart?: Date,
  periodEnd?: Date
): EbosOrderSummary {
  const breakdown: Record<string, number> = {};
  for (const order of orders) {
    const status = order.status ?? "unknown";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }

  return {
    totalOrders: orders.length,
    paidOrders: orders.filter((order) => isPaidStatus(order.status)).length,
    pendingOrders: orders.filter((order) => isPendingStatus(order.status)).length,
    unpaidOrders: orders.filter((order) => isUnpaidStatus(order.status)).length,
    cancelledOrders: orders.filter((order) => isCancelledStatus(order.status)).length,
    refundedOrders: orders.filter((order) => order.status === "refunded").length,
    currentPeriodOrders: orders.filter((order) => inPeriod(order.createdAt, periodStart, periodEnd)).length,
    currentPeriodPaidOrders: orders.filter((order) => isPaidStatus(order.status) && inPeriod(order.paidAt ?? order.createdAt, periodStart, periodEnd)).length,
    conversionEvidenceAvailable: orders.length > 0,
    orderStatusBreakdown: breakdown
  };
}

function summarizeRefunds(
  refunds: EbosRevenueRefundRecord[],
  refundedAmount: number,
  gross: number,
  periodStart?: Date,
  periodEnd?: Date
): EbosRefundSummary {
  const refundRate = gross > 0 ? round(refundedAmount / gross, 4) : 0;
  const refundRisks = refundRate > 0.2 ? ["Refund rate is higher than 20%."] : [];
  return {
    totalRefunds: refunds.length,
    currentPeriodRefunds: refunds.filter((refund) => inPeriod(refund.completedAt ?? refund.createdAt, periodStart, periodEnd)).length,
    refundedAmount,
    refundRate,
    refundRisks
  };
}

function summarizeRevenue(
  orders: EbosRevenueOrderRecord[],
  refundedAmount: number
): EbosRevenueSummary {
  const paidOrders = orders.filter((order) => isPaidStatus(order.status));
  const gross = grossRevenue(orders);
  const net = Math.max(0, round(gross - refundedAmount));
  const paidDates = paidOrders
    .map((order) => order.paidAt)
    .filter((date): date is string => Boolean(date))
    .sort();

  return {
    grossRevenue: gross,
    netRevenue: net,
    refundedAmount,
    paidRevenue: gross,
    pendingRevenue: round(sum(orders.filter((order) => isPendingStatus(order.status)).map((order) => order.amount))),
    unpaidRevenue: round(sum(orders.filter((order) => isUnpaidStatus(order.status)).map((order) => order.amount))),
    averageOrderValue: paidOrders.length ? round(gross / paidOrders.length) : 0,
    firstRevenueAchieved: paidOrders.length > 0 && net > 0,
    firstPaidOrderDate: paidDates[0],
    lastPaidOrderDate: paidDates.at(-1)
  };
}

function buildDatabaseSummary(input: {
  hasOrderModel: boolean;
  hasRefundModel: boolean;
  hasProductModel: boolean;
  unsupportedFields: string[];
  warnings: string[];
}): EbosRevenueDatabaseSummary {
  return {
    hasOrderModel: input.hasOrderModel,
    hasRefundModel: input.hasRefundModel,
    hasPaymentModel: input.hasOrderModel,
    hasProductModel: input.hasProductModel,
    orderFieldsDetected: input.hasOrderModel ? ORDER_FIELDS : [],
    refundFieldsDetected: input.hasRefundModel ? REFUND_FIELDS : [],
    productFieldsDetected: input.hasProductModel ? PRODUCT_FIELDS : [],
    attributionFieldsDetected: input.hasOrderModel ? ATTRIBUTION_FIELDS : [],
    unsupportedFields: [...new Set(input.unsupportedFields)],
    warnings: input.warnings
  };
}

function buildFieldWarnings(rawOrders: unknown[]) {
  const missing = new Set<string>();
  for (const order of rawOrders) {
    const row = asRecord(order) ?? {};
    if (!("amount" in row)) missing.add("order.amount");
    if (!("orderStatus" in row) && !("status" in row)) missing.add("order.orderStatus");
    if (!("createdAt" in row)) missing.add("order.createdAt");
  }
  return [...missing].map((field) => warning(
    "database_field_unavailable",
    `Revenue database field "${field}" was unavailable; revenue evidence may be partial.`,
    field
  ));
}

function emptyRevenueSummary(): EbosRevenueSummary {
  return {
    grossRevenue: 0,
    netRevenue: 0,
    refundedAmount: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    unpaidRevenue: 0,
    averageOrderValue: 0,
    firstRevenueAchieved: false
  };
}

function emptyOrderSummary(): EbosOrderSummary {
  return {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    unpaidOrders: 0,
    cancelledOrders: 0,
    refundedOrders: 0,
    currentPeriodOrders: 0,
    currentPeriodPaidOrders: 0,
    conversionEvidenceAvailable: false,
    orderStatusBreakdown: {}
  };
}

function emptyRefundSummary(): EbosRefundSummary {
  return {
    totalRefunds: 0,
    currentPeriodRefunds: 0,
    refundedAmount: 0,
    refundRate: 0,
    refundRisks: []
  };
}

function grossRevenue(orders: EbosRevenueOrderRecord[]) {
  return round(sum(orders.filter((order) => isPaidStatus(order.status)).map((order) => order.amount)));
}

function isPaidStatus(status: string | undefined) {
  return status === "paid" || status === "activated" || status === "refunded";
}

function isPendingStatus(status: string | undefined) {
  return status === "pending_payment" || status === "pending_review" || status === "pending";
}

function isCancelledStatus(status: string | undefined) {
  return status === "cancelled" || status === "rejected";
}

function isUnpaidStatus(status: string | undefined) {
  return isCancelledStatus(status) || status === "failed";
}

function hasPrice(row: Record<string, unknown>) {
  return row.isDownloadPaid === true || readMoney(row.downloadPrice) > 0 || arrayFrom(row.priceSpecs).length > 0;
}

function hasDownload(row: Record<string, unknown>) {
  return Boolean(readString(row.downloadFileId) || readString(row.onlineUrl));
}

function inPeriod(value: string | undefined, start?: Date, end?: Date) {
  if (!start || !end) return true;
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
}

function readMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return Number(value.toString()) || 0;
  }
  return 0;
}

function sum(values: number[]) {
  return round(values.reduce((total, value) => total + value, 0));
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}
