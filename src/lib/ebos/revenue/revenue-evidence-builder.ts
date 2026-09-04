import { readFile } from "node:fs/promises";
import { getWeeklyWindow } from "../date-window";
import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import {
  readEvidenceCatalog,
  type EbosEvidenceCatalogEntry
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import { attributeRevenueToProducts } from "./revenue-attribution";
import { auditRevenueDatabase } from "./revenue-database-auditor";
import type {
  BuildRevenueEvidenceOptions,
  EbosProductRevenueMetric,
  EbosRevenueEvidence
} from "./revenue-evidence-types";

const DEFAULT_CATALOG_PATH = "reports/ebos/evidence/catalog/latest-evidence-catalog.json";

export async function buildRevenueEvidence(
  options: BuildRevenueEvidenceOptions = {}
): Promise<EbosRevenueEvidence> {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = toDateKey(options.targetDate ?? generatedAt);
  const period = resolvePeriod(options, targetDate);
  const productEvidence = options.productEvidence ?? await readLatestProductEvidence(options.catalogPath);
  const databaseAudit = await auditRevenueDatabase({
    prismaClient: options.prismaClient,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd
  });
  const attribution = attributeRevenueToProducts({
    orders: databaseAudit.orders,
    refunds: databaseAudit.refunds,
    products: databaseAudit.products,
    productEvidence
  });
  const warnings = buildWarnings(databaseAudit.warnings, attribution.warnings, databaseAudit.revenueSummary.netRevenue);
  const risks = buildRisks(databaseAudit, attribution.productMetrics, attribution.unattributedRevenue);
  const opportunities = buildOpportunities(databaseAudit.revenueSummary.firstRevenueAchieved, attribution.recommendedValidationProducts);
  const actionItems = buildActionItems(databaseAudit.revenueSummary.firstRevenueAchieved, attribution.recommendedValidationProducts, attribution.productMetrics, attribution.unattributedRevenue);
  const overallScore = calculateRevenueEvidenceScore({
    paidOrders: databaseAudit.orderSummary.paidOrders,
    totalOrders: databaseAudit.orderSummary.totalOrders,
    netRevenue: databaseAudit.revenueSummary.netRevenue,
    refundRate: databaseAudit.refundSummary.refundRate,
    attributedRevenue: attribution.productMetrics.reduce((total, metric) => total + metric.netRevenue, 0),
    bestReadiness: attribution.recommendedValidationProducts[0]?.revenueReadinessScore ?? 0,
    databaseUnavailable: warnings.some((warning) => warning.code === "database_unavailable")
  });

  return {
    evidenceType: "revenue_evidence",
    targetDate,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    generatedAt,
    overallScore,
    confidence: calculateConfidence(warnings),
    currency: databaseAudit.currency,
    revenueSummary: databaseAudit.revenueSummary,
    orderSummary: databaseAudit.orderSummary,
    refundSummary: databaseAudit.refundSummary,
    productRevenueSummary: {
      productMetrics: attribution.productMetrics,
      unattributedRevenue: attribution.unattributedRevenue,
      recommendedValidationProducts: attribution.recommendedValidationProducts
    },
    revenueReadinessFindings: databaseAudit.revenueSummary.firstRevenueAchieved
      ? ["已完成收入验证。"]
      : ["尚未完成真实收入验证。"],
    attributionFindings: [
      `${attribution.productMetrics.filter((metric) => metric.netRevenue > 0).length} products have attributed net revenue.`,
      `${attribution.unattributedRevenue.ordersCount} orders could not be attributed to products.`
    ],
    risks,
    opportunities,
    actionItems,
    warnings,
    databaseSummary: databaseAudit.databaseSummary,
    manualRevenueSummary: options.manualInput?.revenueSummary
  };
}

export function calculateRevenueEvidenceScore(input: {
  paidOrders: number;
  totalOrders: number;
  netRevenue: number;
  refundRate: number;
  attributedRevenue: number;
  bestReadiness: number;
  databaseUnavailable: boolean;
}) {
  if (input.databaseUnavailable) return 30;

  if (input.netRevenue <= 0) {
    if (input.totalOrders === 0) {
      return Math.min(45, input.bestReadiness >= 70 ? 45 : 35);
    }
    return Math.min(55, 35 + Math.round(input.bestReadiness * 0.2));
  }

  if (input.paidOrders > 0) {
    let score = 60;
    score += 15;
    if (input.attributedRevenue > 0) score += 10;
    if (input.refundRate <= 0.1) score += 10;
    return Math.min(100, score);
  }

  if (input.totalOrders === 0) {
    return Math.min(45, input.bestReadiness >= 70 ? 45 : 35);
  }

  return Math.min(55, 35 + Math.round(input.bestReadiness * 0.2));
}

function buildWarnings(
  databaseWarnings: EbosEvidenceWarning[],
  attributionWarnings: EbosEvidenceWarning[],
  netRevenue: number
) {
  return [
    ...databaseWarnings,
    ...attributionWarnings,
    ...(netRevenue === 0 ? [{
      code: "no_revenue",
      severity: "warning",
      message: "尚未完成第一批真实收入验证。",
      source: "internal_database"
    } satisfies EbosEvidenceWarning] : [])
  ];
}

function buildRisks(
  databaseAudit: Awaited<ReturnType<typeof auditRevenueDatabase>>,
  productMetrics: EbosProductRevenueMetric[],
  unattributedRevenue: EbosProductRevenueMetric
) {
  const risks: string[] = [];
  if (databaseAudit.revenueSummary.netRevenue === 0) risks.push("尚未完成第一批真实收入验证。");
  if (productMetrics.some((metric) => metric.hasPriceConfigured && !metric.hasDownloadConfigured)) risks.push("购买后交付承接不完整。");
  if (databaseAudit.orderSummary.totalOrders > 0 && unattributedRevenue.ordersCount > 0) risks.push("订单无法归因到具体产品。");
  if (databaseAudit.warnings.some((warning) => warning.code === "database_unavailable")) risks.push("收入数据库不可用，当前收入证据只能作为缺口提示。");
  return [...new Set(risks)];
}

function buildOpportunities(
  firstRevenueAchieved: boolean,
  recommendedProducts: EbosProductRevenueMetric[]
) {
  if (firstRevenueAchieved) {
    return ["放大已完成付费验证的产品，优化转化路径并增加渠道分发。"];
  }

  return [
    "选择 1-2 个高 readiness 产品做限时付费验证。",
    ...recommendedProducts.map((product) => `优先验证 ${product.productName ?? product.productSlug ?? product.productId ?? "unknown product"}。`)
  ];
}

function buildActionItems(
  firstRevenueAchieved: boolean,
  recommendedProducts: EbosProductRevenueMetric[],
  productMetrics: EbosProductRevenueMetric[],
  unattributedRevenue: EbosProductRevenueMetric
) {
  const items: EbosEvidenceActionItem[] = [];
  if (!firstRevenueAchieved) {
    items.push(action(
      "revenue-first-validation",
      "选择 1-2 个高 readiness 产品进行首批收入验证",
      "选择产品页 readiness 高、价格和交付配置较完整的产品，完成一次真实下单和支付验证。",
      "critical"
    ));
  }
  if (productMetrics.some((metric) => metric.hasPriceConfigured && !metric.hasDownloadConfigured)) {
    items.push(action(
      "revenue-delivery-readiness",
      "补齐购买后的下载/交付承接",
      "对已有价格配置但缺少下载或交付配置的产品补齐文件、在线地址或售后说明。",
      "high"
    ));
  }
  if (unattributedRevenue.ordersCount > 0) {
    items.push(action(
      "revenue-attribution-fields",
      "补齐订单到产品的归因字段",
      "确保订单带有 toolId、product slug 或可回溯的产品关系。",
      "high"
    ));
  }
  for (const product of recommendedProducts.slice(0, 2)) {
    items.push(action(
      `revenue-validate-${product.productSlug ?? product.productId ?? "product"}`,
      `验证产品收入路径：${product.productName ?? product.productSlug ?? product.productId ?? "unknown product"}`,
      "检查产品页 CTA、价格、下载交付、订单、支付、退款记录，并完成真实付费验证。",
      "high"
    ));
  }
  return dedupeActionItems(items);
}

async function readLatestProductEvidence(catalogPath = DEFAULT_CATALOG_PATH) {
  try {
    const catalog = await readEvidenceCatalog({ catalogPath });
    const entry = catalog?.summary.latestByKind.product_evidence as EbosEvidenceCatalogEntry | undefined;
    if (!entry) return null;
    const envelope = JSON.parse(await readFile(entry.filePath, "utf8")) as { payload?: unknown };
    return envelope.payload as BuildRevenueEvidenceOptions["productEvidence"];
  } catch {
    return null;
  }
}

function resolvePeriod(options: BuildRevenueEvidenceOptions, targetDate: string) {
  if (options.periodStart && options.periodEnd) {
    return {
      periodStart: toDateKey(options.periodStart),
      periodEnd: toDateKey(options.periodEnd)
    };
  }
  const weekly = getWeeklyWindow(new Date(`${targetDate}T12:00:00`));
  return {
    periodStart: toDateKey(weekly.start),
    periodEnd: toDateKey(weekly.end)
  };
}

function calculateConfidence(warnings: EbosEvidenceWarning[]): EbosConfidenceLevel {
  return warnings.length ? "partial" : "complete";
}

function action(
  id: string,
  title: string,
  description: string,
  priority: EbosEvidenceActionItem["priority"]
): EbosEvidenceActionItem {
  return {
    id,
    title,
    description,
    priority,
    owner: "codex",
    relatedSection: "revenue",
    status: "open"
  };
}

function dedupeActionItems(items: EbosEvidenceActionItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
