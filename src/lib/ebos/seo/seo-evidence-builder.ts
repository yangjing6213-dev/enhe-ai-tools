import type { EbosEvidenceActionItem, EbosEvidenceWarning } from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import { runSeoSiteAudit, type RunSeoSiteAuditOptions } from "./seo-site-auditor";
import type {
  EbosSeoEvidence,
  EbosSeoPageAudit,
  EbosSeoSiteSummary
} from "./seo-evidence-types";

export type BuildSeoEvidenceOptions = RunSeoSiteAuditOptions & {
  targetDate?: string | Date;
  generatedAt?: string | Date;
};

export async function buildSeoEvidence(
  options: BuildSeoEvidenceOptions = {}
): Promise<EbosSeoEvidence> {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = toDateKey(options.targetDate ?? generatedAt);
  const siteUrl = (options.siteUrl ?? "https://www.enhe-tech.com.cn").replace(/\/+$/, "");
  const audit = await runSeoSiteAudit({ ...options, siteUrl });
  const summary = summarizeSeoPages(audit.pageAudits);
  const warnings = [
    ...audit.warnings,
    ...audit.pageAudits.flatMap((page) => page.warnings)
  ];
  const risks = buildRisks(summary, audit.sitemapStatus, audit.robotsStatus, audit.pageAudits);
  const opportunities = buildOpportunities(summary, audit.pageAudits);
  const actionItems = buildSeoActionItems(summary, audit.sitemapStatus, audit.robotsStatus, audit.pageAudits);

  return {
    evidenceType: "seo_evidence",
    targetDate,
    siteUrl,
    generatedAt,
    pagesAudited: audit.pageAudits.length,
    sitemapStatus: audit.sitemapStatus === "available" ? "available" : "fallback",
    robotsStatus: audit.robotsStatus,
    overallScore: summary.averageScore,
    confidence: calculateConfidence(audit.pageAudits, warnings),
    technicalFindings: [
      `Sitemap status: ${audit.sitemapStatus}.`,
      `Robots status: ${audit.robotsStatus}.`
    ],
    contentFindings: [
      `${summary.missingTitleCount} pages missing title.`,
      `${summary.missingDescriptionCount} pages missing meta description.`,
      `${summary.missingH1Count} pages missing h1.`
    ],
    structuredDataFindings: [
      `${summary.missingStructuredDataCount} pages missing structured data.`,
      `${summary.pagesWithFaqSignals} pages have FAQ signals.`,
      `${summary.pagesWithProductSignals} pages have product signals.`
    ],
    indexabilityFindings: [`${summary.missingCanonicalCount} pages missing canonical.`],
    internalLinkFindings: [`${audit.pageAudits.filter((page) => page.internalLinksCount === 0).length} pages have no internal links.`],
    risks,
    opportunities,
    actionItems,
    warnings,
    pageAudits: audit.pageAudits,
    summary
  };
}

export function summarizeSeoPages(pageAudits: EbosSeoPageAudit[]): EbosSeoSiteSummary {
  const total = pageAudits.length;
  const averageScore = total
    ? Math.round(pageAudits.reduce((sum, page) => sum + page.score, 0) / total)
    : 0;

  return {
    totalPagesAudited: total,
    passedPages: pageAudits.filter((page) => page.score >= 80).length,
    warningPages: pageAudits.filter((page) => page.score >= 50 && page.score < 80).length,
    criticalPages: pageAudits.filter((page) => page.score < 50).length,
    averageScore,
    missingTitleCount: pageAudits.filter((page) => !page.title).length,
    missingDescriptionCount: pageAudits.filter((page) => !page.metaDescription).length,
    missingH1Count: pageAudits.filter((page) => !page.h1).length,
    missingCanonicalCount: pageAudits.filter((page) => !page.canonical).length,
    missingStructuredDataCount: pageAudits.filter((page) => !page.hasStructuredData).length,
    pagesWithFaqSignals: pageAudits.filter((page) => page.hasFaqSignals).length,
    pagesWithProductSignals: pageAudits.filter((page) => page.hasProductSignals).length
  };
}

function buildRisks(
  summary: EbosSeoSiteSummary,
  sitemapStatus: string,
  robotsStatus: string,
  pageAudits: EbosSeoPageAudit[]
) {
  const risks: string[] = [];
  if (sitemapStatus !== "available") risks.push("Sitemap unavailable or fallback URL list used.");
  if (robotsStatus !== "available") risks.push("Robots.txt unavailable.");
  if (summary.missingTitleCount > 0) risks.push(`${summary.missingTitleCount} pages are missing title.`);
  if (summary.missingDescriptionCount > 0) risks.push(`${summary.missingDescriptionCount} pages are missing meta description.`);
  if (summary.missingH1Count > 0) risks.push(`${summary.missingH1Count} pages are missing h1.`);
  if (summary.missingCanonicalCount > 0) risks.push(`${summary.missingCanonicalCount} pages are missing canonical.`);
  if (summary.missingStructuredDataCount > 0) risks.push(`${summary.missingStructuredDataCount} pages are missing structured data.`);
  if (pageAudits.some((page) => page.pageType === "software_detail" && (!page.hasProductSignals || !page.hasFaqSignals))) {
    risks.push("At least one software detail page is missing Product or FAQ signals.");
  }
  return risks;
}

function buildOpportunities(summary: EbosSeoSiteSummary, pageAudits: EbosSeoPageAudit[]) {
  const opportunities: string[] = [];
  if (summary.missingStructuredDataCount > 0) opportunities.push("Improve structured data coverage for richer search and AI extraction.");
  if (summary.pagesWithFaqSignals < pageAudits.filter((page) => page.pageType === "software_detail").length) {
    opportunities.push("Add FAQ sections to software detail pages.");
  }
  if (pageAudits.some((page) => page.internalLinksCount === 0)) {
    opportunities.push("Add internal links from audited pages to product or service paths.");
  }
  return opportunities;
}

function buildSeoActionItems(
  summary: EbosSeoSiteSummary,
  sitemapStatus: string,
  robotsStatus: string,
  pageAudits: EbosSeoPageAudit[]
) {
  const items: EbosEvidenceActionItem[] = [];
  if (sitemapStatus !== "available") items.push(action("seo-sitemap", "Restore sitemap evidence availability", "Make sitemap.xml readable or document fallback URL coverage.", "high"));
  if (robotsStatus !== "available") items.push(action("seo-robots", "Restore robots.txt evidence availability", "Make robots.txt readable for crawler policy checks.", "high"));
  if (summary.missingTitleCount || summary.missingDescriptionCount || summary.missingH1Count || summary.missingCanonicalCount) {
    items.push(action("seo-basic-tags", "Fix missing SEO title, meta, h1, and canonical coverage", "Patch pages missing basic SEO extraction signals.", "high"));
  }
  if (summary.missingStructuredDataCount) {
    items.push(action("seo-structured-data", "Add structured data to audited pages", "Add JSON-LD schema for product, breadcrumb, article, or FAQ surfaces.", "medium"));
  }
  if (pageAudits.some((page) => page.pageType === "software_detail" && (!page.hasProductSignals || !page.hasFaqSignals))) {
    items.push(action("seo-product-faq", "Add Product and FAQ signals to software detail pages", "Product detail pages need Product/SoftwareApplication and FAQ signals for SEO readiness.", "high"));
  }
  return items;
}

function calculateConfidence(pageAudits: EbosSeoPageAudit[], warnings: EbosEvidenceWarning[]): EbosConfidenceLevel {
  if (pageAudits.length === 0) return "unknown";
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
    relatedSection: "seo",
    status: "open"
  };
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
