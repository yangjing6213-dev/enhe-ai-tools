import type { EbosEvidenceActionItem, EbosEvidenceWarning } from "../evidence";
import type { EbosConfidenceLevel } from "../types";
import type { EbosGeoEvidence, EbosGeoPageAudit } from "./geo-evidence-types";
import { runGeoSiteAudit, type RunGeoSiteAuditOptions } from "./geo-site-auditor";

export type BuildGeoEvidenceOptions = RunGeoSiteAuditOptions & {
  targetDate?: string | Date;
  generatedAt?: string | Date;
};

const READINESS_WARNING = "Current GEO evidence measures page structure readiness and does not represent real AI search citation results.";

export async function buildGeoEvidence(
  options: BuildGeoEvidenceOptions = {}
): Promise<EbosGeoEvidence> {
  const generatedAt = toIsoString(options.generatedAt ?? new Date());
  const targetDate = toDateKey(options.targetDate ?? generatedAt);
  const siteUrl = (options.siteUrl ?? "https://www.enhe-tech.com.cn").replace(/\/+$/, "");
  const audit = await runGeoSiteAudit({ ...options, siteUrl });
  const warnings = [
    warning("geo_probe_not_connected", READINESS_WARNING, "ai_search_probe"),
    ...audit.warnings
  ];
  const overallScore = audit.pageAudits.length
    ? Math.round(audit.pageAudits.reduce((sum, page) => sum + page.score, 0) / audit.pageAudits.length)
    : 0;
  const risks = buildRisks(audit.pageAudits);
  const opportunities = buildOpportunities(audit.pageAudits);
  const actionItems = buildGeoActionItems(audit.pageAudits);

  return {
    evidenceType: "geo_evidence",
    targetDate,
    siteUrl,
    generatedAt,
    pagesAudited: audit.pageAudits.length,
    overallScore,
    confidence: calculateConfidence(audit.pageAudits, warnings),
    entityFindings: [`${audit.pageAudits.filter((page) => page.hasClearEntity).length} pages have clear entity signals.`],
    answerabilityFindings: [`Average answerability score: ${average(audit.pageAudits.map((page) => page.answerabilityScore))}.`],
    citationReadinessFindings: [`Average citation readiness score: ${average(audit.pageAudits.map((page) => page.citationReadinessScore))}.`],
    contentStructureFindings: [
      `${audit.pageAudits.filter((page) => page.hasSummarySection).length} pages have summary sections.`,
      `${audit.pageAudits.filter((page) => page.hasFaqSection).length} pages have FAQ sections.`,
      `${audit.pageAudits.filter((page) => page.hasHowToSection).length} pages have HowTo sections.`
    ],
    risks,
    opportunities,
    actionItems,
    warnings,
    pageAudits: audit.pageAudits
  };
}

function buildRisks(pageAudits: EbosGeoPageAudit[]) {
  const risks: string[] = [];
  if (pageAudits.some((page) => !page.hasClearEntity)) risks.push("Some pages lack clear ENHE or product entity signals.");
  if (pageAudits.some((page) => !page.hasSummarySection)) risks.push("Some pages lack concise summary sections for answer engines.");
  if (pageAudits.some((page) => !page.hasFaqSection)) risks.push("Some pages lack FAQ sections for answerability.");
  if (pageAudits.some((page) => page.pageType === "ai_news" && !page.hasEvidenceOrSourceLinks)) risks.push("Some AI news pages lack source links for citation readiness.");
  return risks;
}

function buildOpportunities(pageAudits: EbosGeoPageAudit[]) {
  const opportunities: string[] = [];
  if (pageAudits.some((page) => !page.hasFaqSection)) opportunities.push("Add FAQ blocks to improve answer-engine extraction.");
  if (pageAudits.some((page) => !page.hasSummarySection)) opportunities.push("Add summary sections to help ChatGPT, Perplexity, and Gemini summarize pages.");
  if (pageAudits.some((page) => !page.hasEvidenceOrSourceLinks)) opportunities.push("Add source or reference links where claims need citation support.");
  return opportunities;
}

function buildGeoActionItems(pageAudits: EbosGeoPageAudit[]) {
  const items: EbosEvidenceActionItem[] = [];
  if (pageAudits.some((page) => page.pageType === "software_detail" && !page.hasFaqSection)) {
    items.push(action("geo-product-faq", "Add FAQ sections to product pages", "Product pages need concise FAQ answers for AI answerability.", "high"));
  }
  if (pageAudits.some((page) => page.pageType === "software_detail" && !page.hasSummarySection)) {
    items.push(action("geo-product-summary", "Add summary sections to product pages", "Product pages need summary or overview sections for answer-engine extraction.", "medium"));
  }
  if (pageAudits.some((page) => page.pageType === "software_detail" && !page.hasClearEntity)) {
    items.push(action("geo-product-entity", "Clarify ENHE and product entity signals", "Make brand and product names explicit near the top of product pages.", "medium"));
  }
  if (pageAudits.some((page) => page.pageType === "ai_news" && (!page.hasEvidenceOrSourceLinks || !page.hasDateSignal))) {
    items.push(action("geo-news-citation", "Add date and source signals to AI news pages", "AI news pages need updated dates and source links before citation-readiness claims.", "medium"));
  }
  if (pageAudits.some((page) => !page.hasAuthorOrBrandSignal)) {
    items.push(action("geo-brand-signal", "Add author or brand signals to audited pages", "Pages need explicit ENHE brand or author signals for trust and citation readiness.", "medium"));
  }
  return items;
}

function calculateConfidence(pageAudits: EbosGeoPageAudit[], warnings: EbosEvidenceWarning[]): EbosConfidenceLevel {
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
    relatedSection: "geo",
    status: "open"
  };
}

function warning(code: string, message: string, source?: string): EbosEvidenceWarning {
  return {
    code,
    severity: "warning",
    message,
    source
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
