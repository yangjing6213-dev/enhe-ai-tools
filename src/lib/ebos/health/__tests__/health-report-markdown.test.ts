import { describe, expect, test } from "vitest";
import { createCommandHealthResult } from "../command-health";
import { createSmokeCheckResult } from "../smoke-checks";
import { renderWebsiteHealthMarkdown } from "../health-report-markdown";
import { calculateWebsiteHealthScore } from "../website-health-score";
import type { EbosWebsiteHealthSnapshot } from "../health-types";

describe("renderWebsiteHealthMarkdown", () => {
  test("includes the required health snapshot headings", () => {
    const snapshot: EbosWebsiteHealthSnapshot = {
      generatedAt: new Date("2026-07-02T12:00:00+08:00"),
      commands: [
        createCommandHealthResult({
          key: "lint",
          command: "npm run lint",
          exitCode: 0
        })
      ]
    };
    const markdown = renderWebsiteHealthMarkdown(snapshot, calculateWebsiteHealthScore(snapshot));

    expect(markdown).toContain("# ENHE Website Health Snapshot");
    expect(markdown).toContain("Score:");
    expect(markdown).toContain("Smoke Checks");
    expect(markdown).toContain("npm run lint");
  });

  test("includes product page URL source details", () => {
    const snapshot: EbosWebsiteHealthSnapshot = {
      generatedAt: new Date("2026-07-02T12:00:00+08:00"),
      commands: [
        createSmokeCheckResult({
          key: "key_product_pages",
          label: "Key Product Page product-a",
          url: "https://example.com/software/product-a",
          status: "passed",
          httpStatus: 200,
          source: "sitemap",
          sourceConfidence: "complete",
          reason: "Discovered in the checked site's sitemap.xml.",
          environmentMismatchRisk: false,
          isProductDetailPage: true
        })
      ]
    };
    const markdown = renderWebsiteHealthMarkdown(snapshot, calculateWebsiteHealthScore(snapshot));

    expect(markdown).toContain("## 产品页 URL 来源说明");
    expect(markdown).toContain("Source: sitemap");
    expect(markdown).toContain("https://example.com/software/product-a");
    expect(markdown).toContain("product detail page");
    expect(markdown).toContain("Environment mismatch risk: no");
  });
});
