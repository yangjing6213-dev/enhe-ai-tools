import type { EbosSeoEvidence } from "./seo-evidence-types";

export function renderSeoEvidenceMarkdown(evidence: EbosSeoEvidence) {
  return [
    "# ENHE SEO Evidence Report",
    "",
    `Target date: ${evidence.targetDate}`,
    `Site: ${evidence.siteUrl}`,
    `Generated at: ${evidence.generatedAt}`,
    "",
    "## 1. SEO Overall Score",
    `Score: ${evidence.overallScore}`,
    `Confidence: ${evidence.confidence}`,
    "",
    "## 2. Audited Page Scope",
    `Pages audited: ${evidence.pagesAudited}`,
    ...evidence.pageAudits.map((page) => `- ${page.url} (${page.pageType}) score=${page.score}`),
    "",
    "## 3. Technical SEO Findings",
    list(evidence.technicalFindings),
    "",
    "## 4. Page Content Structure",
    list(evidence.contentFindings),
    "",
    "## 5. Structured Data",
    list(evidence.structuredDataFindings),
    "",
    "## 6. Product Page SEO",
    list(evidence.pageAudits.filter((page) => page.pageType === "software_detail").map((page) => `${page.url}: Product=${page.hasProductSignals}, FAQ=${page.hasFaqSignals}`)),
    "",
    "## 7. Risks",
    list(evidence.risks),
    "",
    "## 8. Opportunities",
    list(evidence.opportunities),
    "",
    "## 9. Codex SEO Fix Tasks",
    list(evidence.actionItems.map((item) => `[${item.priority}] ${item.title}: ${item.description}`)),
    "",
    "## 10. Data Gaps",
    list(evidence.warnings.map((warning) => warning.message))
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
