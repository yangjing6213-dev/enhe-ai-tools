import type {
  EbosEvidenceActionItem,
  EbosEvidenceWarning
} from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import { auditProductDatabase } from "./product-database-auditor";
import type {
  BuildProductEvidenceOptions,
  EbosProductDatabaseSummary,
  EbosProductEvidence,
  EbosProductPageAudit,
  EbosProductSiteSummary
} from "./product-evidence-types";
import { runProductSiteAudit } from "./product-site-auditor";

export async function buildProductEvidence(
  options: BuildProductEvidenceOptions = {}
): Promise<EbosProductEvidence> {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = toDateKey(options.targetDate ?? generatedAt);
  const siteUrl = (options.siteUrl ?? "https://www.enhe-tech.com.cn").replace(/\/+$/, "");
  const [siteAudit, databaseAudit] = await Promise.all([
    runProductSiteAudit({ ...options, siteUrl }),
    auditProductDatabase({ prismaClient: options.prismaClient })
  ]);
  const siteSummary = summarizeProductPages(siteAudit.pageAudits);
  const warnings = [
    ...siteAudit.warnings,
    ...databaseAudit.warnings
  ];
  const risks = buildRisks(siteSummary, databaseAudit.databaseSummary, siteAudit.pageAudits, warnings);
  const opportunities = buildOpportunities(siteSummary, databaseAudit.databaseSummary);
  const actionItems = dedupeActionItems([
    ...siteAudit.pageAudits.flatMap((page) => page.actionItems),
    ...buildProductActionItems(siteSummary, databaseAudit.databaseSummary)
  ]);
  const overallScore = calculateOverallScore(siteSummary, databaseAudit.databaseSummary);

  return {
    evidenceType: "product_evidence",
    targetDate,
    siteUrl,
    generatedAt,
    productsAudited: siteAudit.pageAudits.length,
    overallScore,
    confidence: calculateProductEvidenceConfidence(siteAudit.pageAudits, warnings),
    productReadinessFindings: [
      `${siteSummary.totalProductsAudited} product URLs audited.`,
      `${siteSummary.passedProducts} passed, ${siteSummary.warningProducts} warning, ${siteSummary.criticalProducts} critical.`
    ],
    conversionFindings: [
      `${siteSummary.missingCtaCount} audited products missing primary CTA.`,
      `${siteAudit.pageAudits.filter((page) => page.hasBuyLink).length} audited products have a buy link.`
    ],
    offerFindings: [
      `${siteAudit.pageAudits.filter((page) => page.hasProductSummary).length} audited products have summaries.`,
      `${siteAudit.pageAudits.filter((page) => page.hasPricingOrPurchaseInfo).length} audited products have pricing or purchase copy.`
    ],
    mediaFindings: [
      `${siteSummary.missingMediaCount} audited products missing product media.`
    ],
    faqFindings: [
      `${siteSummary.missingFaqCount} audited products missing FAQ coverage.`
    ],
    purchasePathFindings: [
      `${siteAudit.pageAudits.filter((page) => page.hasPrimaryCTA).length} audited products have a primary CTA.`,
      `${siteAudit.pageAudits.filter((page) => page.hasDownloadOrDeliveryInfo).length} audited products explain delivery or download.`
    ],
    deliveryFindings: [
      `${siteSummary.missingDeliveryInfoCount} audited products missing delivery information.`,
      `${siteSummary.missingSupportInfoCount} audited products missing support or refund copy.`
    ],
    risks,
    opportunities,
    actionItems,
    warnings,
    productAudits: siteAudit.pageAudits,
    siteSummary,
    databaseSummary: databaseAudit.databaseSummary
  };
}

export function summarizeProductPages(pageAudits: EbosProductPageAudit[]): EbosProductSiteSummary {
  const total = pageAudits.length;
  const averageScore = total
    ? Math.round(pageAudits.reduce((sum, page) => sum + page.score, 0) / total)
    : 0;

  return {
    totalProductsAudited: total,
    passedProducts: pageAudits.filter((page) => page.score >= 80).length,
    warningProducts: pageAudits.filter((page) => page.score >= 50 && page.score < 80).length,
    criticalProducts: pageAudits.filter((page) => page.score < 50).length,
    averageScore,
    missingSummaryCount: pageAudits.filter((page) => !page.hasProductSummary).length,
    missingFaqCount: pageAudits.filter((page) => !page.hasFaqSection).length,
    missingCtaCount: pageAudits.filter((page) => !page.hasPrimaryCTA).length,
    missingMediaCount: pageAudits.filter((page) => !page.hasMedia).length,
    missingDeliveryInfoCount: pageAudits.filter((page) => !page.hasDownloadOrDeliveryInfo).length,
    missingSupportInfoCount: pageAudits.filter((page) => !page.hasRefundOrSupportInfo).length
  };
}

function calculateOverallScore(
  siteSummary: EbosProductSiteSummary,
  databaseSummary: EbosProductDatabaseSummary
) {
  const siteScore = siteSummary.averageScore;
  const databaseScore = calculateDatabaseCompletenessScore(databaseSummary);
  if (siteSummary.totalProductsAudited === 0) return databaseScore;
  return Math.round(siteScore * 0.75 + databaseScore * 0.25);
}

function calculateDatabaseCompletenessScore(summary: EbosProductDatabaseSummary) {
  const base = summary.publishedProducts || summary.totalProducts;
  if (base === 0) return 0;
  const metrics = [
    summary.productsWithPrice,
    summary.productsWithDownload,
    summary.productsWithFaq,
    summary.productsWithCover,
    summary.productsWithTags,
    summary.productsWithSeoFields,
    summary.productsWithGeoFields
  ].filter((value): value is number => typeof value === "number");
  if (metrics.length === 0) return 0;
  const averageCoverage = metrics.reduce((sum, value) => sum + Math.min(1, value / base), 0) / metrics.length;
  return Math.round(averageCoverage * 100);
}

function calculateProductEvidenceConfidence(
  pageAudits: EbosProductPageAudit[],
  warnings: EbosEvidenceWarning[]
): EbosConfidenceLevel {
  if (pageAudits.length === 0) return "unknown";
  return warnings.length ? "partial" : "complete";
}

function buildRisks(
  summary: EbosProductSiteSummary,
  databaseSummary: EbosProductDatabaseSummary,
  pageAudits: EbosProductPageAudit[],
  warnings: EbosEvidenceWarning[]
) {
  const risks: string[] = [];
  if (summary.totalProductsAudited === 0) risks.push("No product pages were audited.");
  if (summary.missingSummaryCount > 0) risks.push(`${summary.missingSummaryCount} audited products are missing summaries.`);
  if (summary.missingFaqCount > 0) risks.push(`${summary.missingFaqCount} audited products are missing FAQ sections.`);
  if (summary.missingCtaCount > 0) risks.push(`${summary.missingCtaCount} audited products are missing primary CTA.`);
  if (summary.missingDeliveryInfoCount > 0) risks.push(`${summary.missingDeliveryInfoCount} audited products are missing delivery information.`);
  if (summary.missingSupportInfoCount > 0) risks.push(`${summary.missingSupportInfoCount} audited products are missing support or refund information.`);
  if (databaseSummary.publishedProducts > 0 && (databaseSummary.productsWithPrice ?? 0) < databaseSummary.publishedProducts) {
    risks.push("Some published products do not have price or purchase configuration.");
  }
  if (databaseSummary.publishedProducts > 0 && (databaseSummary.productsWithDownload ?? 0) < databaseSummary.publishedProducts) {
    risks.push("Some published products do not have download or delivery configuration.");
  }
  if (pageAudits.every((page) => page.score >= 70) && databaseSummary.totalProducts === 0) {
    risks.push("Product pages have some conversion foundation, but database product evidence is empty.");
  }
  if (warnings.some((item) => item.code === "database_unavailable")) {
    risks.push("Internal product database evidence is unavailable.");
  }
  risks.push("Revenue evidence is not connected yet, so product conversion cannot be tied to orders or income.");
  return [...new Set(risks)];
}

function buildOpportunities(
  summary: EbosProductSiteSummary,
  databaseSummary: EbosProductDatabaseSummary
) {
  const opportunities: string[] = [];
  if (summary.missingMediaCount > 0) opportunities.push("Add product screenshots or demo videos to improve purchase confidence.");
  if (summary.missingFaqCount > 0) opportunities.push("Add FAQ sections to reduce buyer uncertainty.");
  if (summary.missingDeliveryInfoCount > 0) opportunities.push("Clarify delivery, download, license, and support expectations.");
  if (databaseSummary.publishedProducts > 0) opportunities.push("Use database product completeness to prioritize published products with missing offer fields.");
  opportunities.push("Prioritize 1-2 products for revenue validation before broad product optimization.");
  return [...new Set(opportunities)];
}

function buildProductActionItems(
  summary: EbosProductSiteSummary,
  databaseSummary: EbosProductDatabaseSummary
) {
  const items: EbosEvidenceActionItem[] = [];
  if (summary.missingSummaryCount > 0) items.push(action("product-summary-coverage", "Optimize product page summary coverage", "Add concise summaries to audited product pages missing summary copy.", "high"));
  if (summary.missingFaqCount > 0) items.push(action("product-faq-coverage", "Add FAQ sections to product pages", "Cover buyer questions about setup, payment, delivery, refunds, and support.", "medium"));
  if (summary.missingCtaCount > 0) items.push(action("product-cta-coverage", "Add purchase CTA to product pages", "Make the primary purchase or download path visible on product pages.", "high"));
  if (summary.missingMediaCount > 0) items.push(action("product-media-coverage", "Add product media to product pages", "Add screenshots, video demo, or product images to audited pages.", "medium"));
  if (summary.missingDeliveryInfoCount > 0) items.push(action("product-delivery-coverage", "Add delivery and support copy to product pages", "Explain download, license, activation, support, and refund expectations.", "high"));
  if (databaseSummary.publishedProducts > 0 && (databaseSummary.productsWithPrice ?? 0) < databaseSummary.publishedProducts) {
    items.push(action("product-db-price", "Complete product price configuration", "Review published products and add price specs or paid download configuration where needed.", "high"));
  }
  if (databaseSummary.publishedProducts > 0 && (databaseSummary.productsWithDownload ?? 0) < databaseSummary.publishedProducts) {
    items.push(action("product-db-delivery", "Complete product download configuration", "Review published products and connect download files or online delivery URLs.", "high"));
  }
  items.push(action("product-revenue-validation", "Select 1-2 products for revenue validation", "Connect product page, checkout, order, and revenue evidence for the highest-intent products.", "high"));
  return items;
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
    relatedSection: "product",
    status: "open"
  };
}

function dedupeActionItems(items: EbosEvidenceActionItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
