import { describe, expect, test } from "vitest";
import { buildCompetitorEvidence } from "../competitor-evidence-builder";
import { renderCompetitorEvidenceMarkdown } from "../competitor-evidence-markdown";

describe("competitor evidence markdown public audit details", () => {
  test("renders public URL audit status, audited competitors, and data boundaries", async () => {
    const evidence = await buildCompetitorEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      includeNetworkSources: true,
      maxCompetitors: 1,
      maxPagesPerCompetitor: 1,
      maxTotalUrls: 1,
      fetcher: async () => ({
        ok: true,
        status: 200,
        text: async () => "<html><title>AI Agent Pricing</title><body><h1>AI Agent Workflow</h1><a>Pricing</a><button>Get started</button><section>FAQ</section></body></html>"
      })
    });
    const markdown = renderCompetitorEvidenceMarkdown(evidence);

    expect(markdown).toContain("networkSourcesEnabled");
    expect(markdown).toContain("pagesAttempted");
    expect(markdown).toContain("Futurepedia");
    expect(markdown).toContain("pagesAudited=1");
    expect(markdown).toContain("Pricing");
    expect(markdown).toContain("CTA");
    expect(markdown).toContain("Only public page structure was observed");
    expect(markdown).toContain("does not represent traffic, sales, or revenue");
  });
});
