import { describe, expect, test } from "vitest";
import type { EbosSeoEvidence } from "../seo-evidence-types";
import { renderSeoEvidenceMarkdown } from "../seo-evidence-markdown";

describe("seo-evidence-markdown", () => {
  test("contains the ten required report headings", () => {
    const markdown = renderSeoEvidenceMarkdown({
      evidenceType: "seo_evidence",
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      generatedAt: "2026-07-03T00:00:00.000Z",
      pagesAudited: 0,
      sitemapStatus: "unavailable",
      robotsStatus: "unavailable",
      overallScore: 0,
      confidence: "partial",
      technicalFindings: [],
      contentFindings: [],
      structuredDataFindings: [],
      indexabilityFindings: [],
      internalLinkFindings: [],
      risks: [],
      opportunities: [],
      actionItems: [],
      warnings: [],
      pageAudits: [],
      summary: {
        totalPagesAudited: 0,
        passedPages: 0,
        warningPages: 0,
        criticalPages: 0,
        averageScore: 0,
        missingTitleCount: 0,
        missingDescriptionCount: 0,
        missingH1Count: 0,
        missingCanonicalCount: 0,
        missingStructuredDataCount: 0,
        pagesWithFaqSignals: 0,
        pagesWithProductSignals: 0
      }
    } satisfies EbosSeoEvidence);

    for (const heading of [
      "## 1. SEO Overall Score",
      "## 2. Audited Page Scope",
      "## 3. Technical SEO Findings",
      "## 4. Page Content Structure",
      "## 5. Structured Data",
      "## 6. Product Page SEO",
      "## 7. Risks",
      "## 8. Opportunities",
      "## 9. Codex SEO Fix Tasks",
      "## 10. Data Gaps"
    ]) {
      expect(markdown).toContain(heading);
    }
  });
});
