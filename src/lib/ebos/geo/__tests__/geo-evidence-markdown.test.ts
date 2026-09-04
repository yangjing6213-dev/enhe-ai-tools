import { describe, expect, test } from "vitest";
import type { EbosGeoEvidence } from "../geo-evidence-types";
import { renderGeoEvidenceMarkdown } from "../geo-evidence-markdown";

describe("geo-evidence-markdown", () => {
  test("contains the eleven required report headings", () => {
    const markdown = renderGeoEvidenceMarkdown({
      evidenceType: "geo_evidence",
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      generatedAt: "2026-07-03T00:00:00.000Z",
      pagesAudited: 0,
      overallScore: 0,
      confidence: "partial",
      entityFindings: [],
      answerabilityFindings: [],
      citationReadinessFindings: [],
      contentStructureFindings: [],
      risks: [],
      opportunities: [],
      actionItems: [],
      warnings: [],
      pageAudits: []
    } satisfies EbosGeoEvidence);

    for (const heading of [
      "## 1. GEO Overall Score",
      "## 2. Audited Page Scope",
      "## 3. Entity and Brand Signals",
      "## 4. AI Answerability",
      "## 5. AI Citation Readiness",
      "## 6. Product Page GEO",
      "## 7. News Page GEO",
      "## 8. Risks",
      "## 9. Opportunities",
      "## 10. Codex GEO Optimization Tasks",
      "## 11. Data Gaps"
    ]) {
      expect(markdown).toContain(heading);
    }
  });
});
