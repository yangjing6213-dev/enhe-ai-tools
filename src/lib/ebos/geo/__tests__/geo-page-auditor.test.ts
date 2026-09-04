import { describe, expect, test } from "vitest";
import { auditGeoPage, extractGeoSignals } from "../geo-page-auditor";

const geoHtml = `
<html>
  <head>
    <title>ENHE AI Workflow Pack</title>
    <meta property="article:modified_time" content="2026-07-03T00:00:00.000Z">
    <script type="application/ld+json">{"@type":"FAQPage"}</script>
  </head>
  <body>
    <h1>ENHE AI Workflow Pack</h1>
    <section><h2>Summary</h2><p>ENHE helps creators build AI workflows.</p></section>
    <section><h2>FAQ</h2><p>Common answers.</p></section>
    <section><h2>How to use</h2><ol><li>Install</li></ol></section>
    <section><h2>Pricing</h2><p>Buy the pack.</p></section>
    <p>Updated on 2026-07-03 by ENHE.</p>
    <a href="https://example.com/source">External source</a>
  </body>
</html>`;

describe("geo-page-auditor", () => {
  test("detects FAQ, summary, entity, brand, date, and source signals", () => {
    const signals = extractGeoSignals(geoHtml, "https://www.enhe-tech.com.cn/software/windows-ai");

    expect(signals.hasClearEntity).toBe(true);
    expect(signals.detectedEntities).toContain("ENHE");
    expect(signals.hasSummarySection).toBe(true);
    expect(signals.hasFaqSection).toBe(true);
    expect(signals.hasAuthorOrBrandSignal).toBe(true);
    expect(signals.hasDateSignal).toBe(true);
    expect(signals.hasEvidenceOrSourceLinks).toBe(true);
  });

  test("adds action guidance when FAQ is missing", () => {
    const audit = auditGeoPage({
      url: "https://www.enhe-tech.com.cn/software/no-faq",
      html: "<html><head><title>ENHE Tool</title></head><body><h1>ENHE Tool</h1><p>Summary of ENHE tool.</p></body></html>"
    });

    expect(audit.risks).toContain("Page is missing FAQ signals for answer-engine extraction.");
    expect(audit.opportunities).toContain("Add concise FAQ content that answers buyer and setup questions.");
  });

  test("warns when news pages miss date or source signals", () => {
    const audit = auditGeoPage({
      url: "https://www.enhe-tech.com.cn/ai-news/example",
      html: "<html><head><title>ENHE News</title></head><body><h1>ENHE News</h1><p>AI news text.</p></body></html>"
    });

    expect(audit.warnings.some((warning) => warning.message.includes("date"))).toBe(true);
    expect(audit.warnings.some((warning) => warning.message.includes("source"))).toBe(true);
  });
});
