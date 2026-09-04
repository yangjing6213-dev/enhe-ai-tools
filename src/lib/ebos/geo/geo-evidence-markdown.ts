import type { EbosGeoEvidence } from "./geo-evidence-types";

export function renderGeoEvidenceMarkdown(evidence: EbosGeoEvidence) {
  return [
    "# ENHE GEO Evidence Report",
    "",
    `Target date: ${evidence.targetDate}`,
    `Site: ${evidence.siteUrl}`,
    `Generated at: ${evidence.generatedAt}`,
    "",
    "## 1. GEO Overall Score",
    `Score: ${evidence.overallScore}`,
    `Confidence: ${evidence.confidence}`,
    "",
    "## 2. Audited Page Scope",
    `Pages audited: ${evidence.pagesAudited}`,
    ...evidence.pageAudits.map((page) => `- ${page.url} (${page.pageType}) score=${page.score}`),
    "",
    "## 3. Entity and Brand Signals",
    list(evidence.entityFindings),
    "",
    "## 4. AI Answerability",
    list(evidence.answerabilityFindings),
    "",
    "## 5. AI Citation Readiness",
    list(evidence.citationReadinessFindings),
    "",
    "## 6. Product Page GEO",
    list(evidence.pageAudits.filter((page) => page.pageType === "software_detail").map((page) => `${page.url}: entity=${page.hasClearEntity}, FAQ=${page.hasFaqSection}, summary=${page.hasSummarySection}`)),
    "",
    "## 7. News Page GEO",
    list(evidence.pageAudits.filter((page) => page.pageType === "ai_news").map((page) => `${page.url}: date=${page.hasDateSignal}, sources=${page.hasEvidenceOrSourceLinks}`)),
    "",
    "## 8. Risks",
    list(evidence.risks),
    "",
    "## 9. Opportunities",
    list(evidence.opportunities),
    "",
    "## 10. Codex GEO Optimization Tasks",
    list(evidence.actionItems.map((item) => `[${item.priority}] ${item.title}: ${item.description}`)),
    "",
    "## 11. Data Gaps",
    list(evidence.warnings.map((warning) => warning.message))
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
