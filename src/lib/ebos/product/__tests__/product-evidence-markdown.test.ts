import { describe, expect, test } from "vitest";
import { renderProductEvidenceMarkdown } from "../product-evidence-markdown";
import type { EbosProductEvidence } from "../product-evidence-types";

function evidence(): EbosProductEvidence {
  return {
    evidenceType: "product_evidence",
    targetDate: "2026-07-03",
    siteUrl: "https://example.com",
    generatedAt: "2026-07-03T00:00:00.000Z",
    productsAudited: 1,
    overallScore: 72,
    confidence: "partial",
    productReadinessFindings: ["1 product page audited."],
    conversionFindings: ["Primary CTA coverage is partial."],
    offerFindings: ["Pricing copy exists."],
    mediaFindings: ["Product image exists."],
    faqFindings: ["FAQ coverage is partial."],
    purchasePathFindings: ["Buy link exists."],
    deliveryFindings: ["Delivery copy is thin."],
    risks: ["Delivery info is thin."],
    opportunities: ["Prioritize 1-2 revenue validation products."],
    actionItems: [],
    warnings: [],
    productAudits: [],
    siteSummary: {
      totalProductsAudited: 1,
      passedProducts: 0,
      warningProducts: 1,
      criticalProducts: 0,
      averageScore: 72,
      missingSummaryCount: 0,
      missingFaqCount: 1,
      missingCtaCount: 0,
      missingMediaCount: 0,
      missingDeliveryInfoCount: 1,
      missingSupportInfoCount: 0
    },
    databaseSummary: {
      totalProducts: 0,
      publishedProducts: 0,
      draftProducts: 0
    }
  };
}

describe("product evidence markdown", () => {
  test("contains the required 13 report headings", () => {
    const markdown = renderProductEvidenceMarkdown(evidence());

    expect(markdown).toContain("# ENHE Product Evidence Report");
    for (const heading of [
      "## 1. Product Conversion Overall Score",
      "## 2. Audited Product Scope",
      "## 3. Product Page Conversion Capability",
      "## 4. Offer Clarity",
      "## 5. CTA And Purchase Path",
      "## 6. FAQ And Trust Signals",
      "## 7. Media Assets And Demo Content",
      "## 8. Download Delivery And Support",
      "## 9. Database Product Completeness",
      "## 10. Main Risks",
      "## 11. Growth Opportunities",
      "## 12. Codex Product Optimization Tasks",
      "## 13. Data Gaps"
    ]) {
      expect(markdown).toContain(heading);
    }
  });
});
