import { describe, expect, test } from "vitest";
import {
  auditCompetitorPage,
  calculateCompetitorPageScore,
  classifyCompetitorPageType,
  extractCompetitorSignals
} from "../competitor-page-auditor";

const richHtml = `
  <html>
    <head>
      <title>AI Agent Workflow Packs and Prompt Kits</title>
      <meta name="description" content="Compare AI video workflow packs, prompts, pricing, FAQ, and use cases." />
    </head>
    <body>
      <h1>AI Agent and AI Video Workflow Marketplace</h1>
      <a href="/pricing">Pricing</a>
      <button>Start free trial</button>
      <section>FAQ: how to use this prompt kit and workflow pack.</section>
      <section>Use case: automate SEO/GEO research with a ComfyUI workflow.</section>
      <section>Compare templates, video demos, media previews, affiliate listings, newsletter, and waitlist.</section>
      <time datetime="2026-07-03">2026-07-03</time>
      <span>Author: ENHE research</span>
    </body>
  </html>
`;

describe("competitor page auditor", () => {
  test("classifies common competitor page types from URL paths", () => {
    expect(classifyCompetitorPageType("https://example.com/pricing")).toBe("pricing");
    expect(classifyCompetitorPageType("https://example.com/tools")).toBe("product_listing");
    expect(classifyCompetitorPageType("https://example.com/blog/how-to-use-ai")).toBe("blog");
    expect(classifyCompetitorPageType("https://example.com/docs/setup")).toBe("docs");
    expect(classifyCompetitorPageType("https://example.com")).toBe("homepage");
  });

  test("extracts pricing, listing, FAQ, CTA, media, GEO, and product type signals", () => {
    const signals = extractCompetitorSignals(richHtml, "https://example.com/tools/ai-video");

    expect(signals.title).toBe("AI Agent Workflow Packs and Prompt Kits");
    expect(signals.metaDescription).toContain("pricing");
    expect(signals.h1).toContain("Marketplace");
    expect(signals.hasPricingSignal).toBe(true);
    expect(signals.hasProductListingSignal).toBe(true);
    expect(signals.hasFaqSignal).toBe(true);
    expect(signals.hasStrongCTA).toBe(true);
    expect(signals.hasVideoOrMediaSignal).toBe(true);
    expect(signals.hasMarketplaceSignal).toBe(true);
    expect(signals.detectedGeoSignals).toEqual(expect.arrayContaining(["faq", "how-to", "source", "date", "author"]));
    expect(signals.detectedProductTypes).toEqual(expect.arrayContaining([
      "AI Agent",
      "AI Video",
      "Prompt Kit",
      "Workflow Pack",
      "ComfyUI Workflow"
    ]));
  });

  test("scores stronger pages higher than sparse pages", () => {
    const richSignals = extractCompetitorSignals(richHtml, "https://example.com/tools/ai-video");
    const sparseSignals = extractCompetitorSignals("<html><body>Untitled</body></html>", "https://example.com/unknown");

    expect(calculateCompetitorPageScore(richSignals)).toBeGreaterThanOrEqual(80);
    expect(calculateCompetitorPageScore(sparseSignals)).toBeLessThan(40);
  });

  test("audits missing HTML without crashing", async () => {
    const audit = await auditCompetitorPage({
      competitorId: "empty",
      competitorName: "Empty Competitor",
      url: "https://example.com/empty",
      html: ""
    });

    expect(audit.url).toBe("https://example.com/empty");
    expect(audit.score).toBeLessThan(40);
    expect(audit.confidence).toBe("unknown");
    expect(audit.warnings).toContainEqual(expect.objectContaining({
      code: "competitor_page_empty"
    }));
  });
});
