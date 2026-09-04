import type { EbosProductEvidence } from "./product-evidence-types";

export function renderProductEvidenceMarkdown(evidence: EbosProductEvidence) {
  return [
    "# ENHE Product Evidence Report",
    "",
    `Target date: ${evidence.targetDate}`,
    `Site: ${evidence.siteUrl}`,
    `Generated at: ${evidence.generatedAt}`,
    "",
    "## 1. Product Conversion Overall Score",
    `Score: ${evidence.overallScore}`,
    `Confidence: ${evidence.confidence}`,
    "",
    "## 2. Audited Product Scope",
    `Products audited: ${evidence.productsAudited}`,
    ...evidence.productAudits.map((page) => `- ${page.url} score=${page.score} confidence=${page.confidence}`),
    "",
    "## 3. Product Page Conversion Capability",
    list(evidence.conversionFindings),
    "",
    "## 4. Offer Clarity",
    list(evidence.offerFindings),
    "",
    "## 5. CTA And Purchase Path",
    list(evidence.purchasePathFindings),
    "",
    "## 6. FAQ And Trust Signals",
    list(evidence.faqFindings),
    "",
    "## 7. Media Assets And Demo Content",
    list(evidence.mediaFindings),
    "",
    "## 8. Download Delivery And Support",
    list(evidence.deliveryFindings),
    "",
    "## 9. Database Product Completeness",
    renderDatabaseSummary(evidence),
    "",
    "## 10. Main Risks",
    list(evidence.risks),
    "",
    "## 11. Growth Opportunities",
    list(evidence.opportunities),
    "",
    "## 12. Codex Product Optimization Tasks",
    list(evidence.actionItems.map((item) => `[${item.priority}] ${item.title}: ${item.description}`)),
    "",
    "## 13. Data Gaps",
    list(evidence.warnings.map((warning) => warning.message))
  ].join("\n");
}

function renderDatabaseSummary(evidence: EbosProductEvidence) {
  const summary = evidence.databaseSummary;
  if (!summary) return "- none";
  return [
    `- Total products: ${summary.totalProducts}`,
    `- Published products: ${summary.publishedProducts}`,
    `- Draft products: ${summary.draftProducts}`,
    `- Products with price: ${summary.productsWithPrice ?? "unknown"}`,
    `- Products with download: ${summary.productsWithDownload ?? "unknown"}`,
    `- Products with FAQ: ${summary.productsWithFaq ?? "unknown"}`,
    `- Products with cover: ${summary.productsWithCover ?? "unknown"}`,
    `- Products with tags: ${summary.productsWithTags ?? "unknown"}`,
    `- Products with SEO fields: ${summary.productsWithSeoFields ?? "unknown"}`,
    `- Products with GEO fields: ${summary.productsWithGeoFields ?? "unknown"}`
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
