import type { EbosEvidenceWarning } from "../evidence";
import type {
  AttributeRevenueToProductsOptions,
  EbosProductRevenueMetric,
  EbosRevenueAttributionResult,
  EbosRevenueOrderRecord,
  EbosRevenueProductRecord,
  EbosRevenueRefundRecord
} from "./revenue-evidence-types";

export function attributeRevenueToProducts(
  options: AttributeRevenueToProductsOptions
): EbosRevenueAttributionResult {
  const warnings: EbosEvidenceWarning[] = [];
  const productMap = buildProductMap(enrichProductsWithEvidence(options.products, options.productEvidence));
  const metricsByKey = new Map<string, EbosProductRevenueMetric>();
  let unattributedRevenue = emptyMetric();

  for (const product of productMap.values()) {
    const key = productKey(product);
    if (key) metricsByKey.set(key, metricFromProduct(product));
  }

  for (const order of options.orders) {
    const key = orderProductKey(order);
    const metric = key ? metricsByKey.get(key) : undefined;
    if (!metric) {
      unattributedRevenue = addOrderToMetric(unattributedRevenue, order, options.refunds);
      continue;
    }
    metricsByKey.set(key!, addOrderToMetric(metric, order, options.refunds));
  }

  const productMetrics = [...metricsByKey.values()].map(finalizeMetric);
  unattributedRevenue = finalizeMetric(unattributedRevenue);

  if (unattributedRevenue.ordersCount > 0 || unattributedRevenue.grossRevenue > 0) {
    warnings.push({
      code: "revenue_unattributed",
      severity: "warning",
      message: "Some order revenue could not be attributed to a specific product.",
      source: "internal_database"
    });
  }

  return {
    productMetrics,
    unattributedRevenue,
    recommendedValidationProducts: rankProductsForRevenueValidation(productMetrics),
    warnings
  };
}

export function calculateProductRevenueReadiness(metric: EbosProductRevenueMetric) {
  let score = 0;
  if (metric.hasPriceConfigured) score += 20;
  if (metric.hasDownloadConfigured) score += 20;
  if (metric.hasFaqConfigured) score += 10;
  if ((metric.productPageScore ?? 0) >= 80) score += 25;
  else if (typeof metric.productPageScore === "number") score += Math.round(metric.productPageScore * 0.2);
  if (metric.ordersCount > 0) score += 10;
  if (metric.paidOrdersCount > 0) score += 15;
  return Math.max(0, Math.min(100, score));
}

export function rankProductsForRevenueValidation(
  productMetrics: EbosProductRevenueMetric[]
) {
  return [...productMetrics]
    .sort((a, b) =>
      b.revenueReadinessScore - a.revenueReadinessScore ||
      (b.productPageScore ?? 0) - (a.productPageScore ?? 0) ||
      Number(Boolean(b.hasPriceConfigured)) - Number(Boolean(a.hasPriceConfigured)) ||
      Number(Boolean(b.hasDownloadConfigured)) - Number(Boolean(a.hasDownloadConfigured))
    )
    .slice(0, 2);
}

function enrichProductsWithEvidence(
  products: EbosRevenueProductRecord[],
  productEvidence: AttributeRevenueToProductsOptions["productEvidence"]
) {
  const audits = productEvidence?.productAudits ?? [];
  const bySlug = new Map(audits.map((audit) => [audit.slug, audit]));
  const enriched = products.map((product) => {
    const audit = product.productSlug ? bySlug.get(product.productSlug) : undefined;
    return {
      ...product,
      productPageScore: product.productPageScore ?? audit?.score,
      productName: product.productName ?? audit?.productName
    };
  });

  for (const audit of audits) {
    if (!audit.slug || enriched.some((product) => product.productSlug === audit.slug)) continue;
    enriched.push({
      productSlug: audit.slug,
      productName: audit.productName,
      productPageScore: audit.score,
      hasPriceConfigured: (productEvidence?.databaseSummary?.productsWithPrice ?? 0) > 0,
      hasDownloadConfigured: (productEvidence?.databaseSummary?.productsWithDownload ?? 0) > 0,
      hasFaqConfigured: (productEvidence?.databaseSummary?.productsWithFaq ?? 0) > 0
    });
  }

  return enriched;
}

function buildProductMap(products: EbosRevenueProductRecord[]) {
  const map = new Map<string, EbosRevenueProductRecord>();
  for (const product of products) {
    const keys = [product.productId, product.productSlug, product.productName].filter((key): key is string => Boolean(key));
    for (const key of keys) map.set(key, product);
  }
  return map;
}

function productKey(product: EbosRevenueProductRecord) {
  return product.productId ?? product.productSlug ?? product.productName;
}

function orderProductKey(order: EbosRevenueOrderRecord) {
  return order.productId ?? order.toolId ?? order.productSlug ?? order.productName;
}

function metricFromProduct(product: EbosRevenueProductRecord): EbosProductRevenueMetric {
  return finalizeMetric({
    productId: product.productId,
    productSlug: product.productSlug,
    productName: product.productName,
    ordersCount: 0,
    paidOrdersCount: 0,
    grossRevenue: 0,
    netRevenue: 0,
    refundedAmount: 0,
    averageOrderValue: 0,
    hasPriceConfigured: product.hasPriceConfigured,
    hasDownloadConfigured: product.hasDownloadConfigured,
    hasFaqConfigured: product.hasFaqConfigured,
    productPageScore: product.productPageScore,
    revenueReadinessScore: 0,
    findings: [],
    risks: [],
    opportunities: [],
    actionItems: []
  });
}

function addOrderToMetric(
  metric: EbosProductRevenueMetric,
  order: EbosRevenueOrderRecord,
  refunds: EbosRevenueRefundRecord[]
): EbosProductRevenueMetric {
  const paid = isPaidStatus(order.status);
  const refundedAmount = refunds
    .filter((refund) => refund.orderId === order.id && refund.status !== "rejected")
    .reduce((total, refund) => total + refund.amount, 0) || order.refundedAmount || 0;

  return {
    ...metric,
    productId: metric.productId ?? order.productId ?? order.toolId,
    productSlug: metric.productSlug ?? order.productSlug,
    productName: metric.productName ?? order.productName,
    ordersCount: metric.ordersCount + 1,
    paidOrdersCount: metric.paidOrdersCount + (paid ? 1 : 0),
    grossRevenue: round(metric.grossRevenue + (paid ? order.amount : 0)),
    netRevenue: round(metric.netRevenue + (paid ? Math.max(0, order.amount - refundedAmount) : 0)),
    refundedAmount: round(metric.refundedAmount + refundedAmount)
  };
}

function finalizeMetric(metric: EbosProductRevenueMetric): EbosProductRevenueMetric {
  const averageOrderValue = metric.paidOrdersCount ? round(metric.grossRevenue / metric.paidOrdersCount) : 0;
  const next = {
    ...metric,
    averageOrderValue,
    findings: buildFindings(metric),
    risks: buildRisks(metric),
    opportunities: buildOpportunities(metric),
    actionItems: buildActionItems(metric)
  };
  return {
    ...next,
    revenueReadinessScore: calculateProductRevenueReadiness(next)
  };
}

function emptyMetric(): EbosProductRevenueMetric {
  return {
    ordersCount: 0,
    paidOrdersCount: 0,
    grossRevenue: 0,
    netRevenue: 0,
    refundedAmount: 0,
    averageOrderValue: 0,
    revenueReadinessScore: 0,
    findings: [],
    risks: [],
    opportunities: [],
    actionItems: []
  };
}

function buildFindings(metric: EbosProductRevenueMetric) {
  const findings: string[] = [];
  if (metric.hasPriceConfigured) findings.push("Price configuration is present.");
  if (metric.hasDownloadConfigured) findings.push("Download or delivery configuration is present.");
  if (metric.paidOrdersCount > 0) findings.push(`${metric.paidOrdersCount} paid orders attributed.`);
  return findings;
}

function buildRisks(metric: EbosProductRevenueMetric) {
  const risks: string[] = [];
  if (metric.hasPriceConfigured && !metric.hasDownloadConfigured) risks.push("购买后交付承接不完整。");
  if (!metric.hasPriceConfigured) risks.push("Product price configuration is missing.");
  return risks;
}

function buildOpportunities(metric: EbosProductRevenueMetric) {
  const opportunities: string[] = [];
  if (metric.paidOrdersCount === 0 && metric.revenueReadinessScore >= 60) opportunities.push("Use this product for first revenue validation.");
  if (metric.paidOrdersCount > 0) opportunities.push("Scale this validated product with more channels and conversion improvements.");
  return opportunities;
}

function buildActionItems(metric: EbosProductRevenueMetric) {
  const items: string[] = [];
  if (!metric.hasDownloadConfigured) items.push("配置下载/交付承接");
  if (!metric.hasPriceConfigured) items.push("配置价格/购买入口");
  if (metric.paidOrdersCount === 0) items.push("进行首批收入验证");
  return items;
}

function isPaidStatus(status: string | undefined) {
  return status === "paid" || status === "activated" || status === "refunded";
}

function round(value: number) {
  return Number(value.toFixed(2));
}
