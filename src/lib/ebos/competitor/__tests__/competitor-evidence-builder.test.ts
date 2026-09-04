import { describe, expect, test } from "vitest";
import { validateEvidenceEnvelope, wrapCompetitorEvidence } from "../../evidence";
import { buildCompetitorEvidence } from "../competitor-evidence-builder";

describe("competitor evidence builder", () => {
  test("builds manual-only evidence without crashing and keeps confidence partial", async () => {
    const evidence = await buildCompetitorEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      includeNetworkSources: false,
      manualInput: {
        seeds: [{
          id: "manual-directory",
          name: "Manual Directory",
          url: "https://example.com/tools",
          category: "ai_tool_directory",
          priority: "high",
          source: "manual"
        }]
      }
    });

    expect(evidence.evidenceType).toBe("competitor_evidence");
    expect(evidence.competitorSummary.competitorsCount).toBe(1);
    expect(evidence.competitorSummary.competitorsAuditedCount).toBe(0);
    expect(evidence.confidence).toBe("partial");
    expect(evidence.warnings).toContainEqual(expect.objectContaining({
      code: "manual_competitor_seed"
    }));
    expect(evidence.differentiationOpportunities.length).toBeGreaterThan(0);
  });

  test("wraps competitor evidence into a valid ebos-evidence-v1 envelope", async () => {
    const evidence = await buildCompetitorEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      includeNetworkSources: false
    });
    const envelope = wrapCompetitorEvidence(evidence, {
      targetDate: evidence.targetDate,
      generatedAt: evidence.generatedAt,
      periodStart: evidence.periodStart,
      periodEnd: evidence.periodEnd,
      generator: "unit-test"
    });

    expect(envelope.meta.contractVersion).toBe("ebos-evidence-v1");
    expect(envelope.meta.evidenceKind).toBe("competitor_evidence");
    expect(envelope.quality.score).toBe(evidence.overallScore);
    expect(envelope.quality.confidence).toBe(evidence.confidence);
    expect(envelope.quality.warningsCount).toBe(evidence.warnings.length);
    expect(envelope.actionItems).toHaveLength(evidence.actionItems.length);
    expect(validateEvidenceEnvelope(envelope).valid).toBe(true);
  });

  test("writes public page audit signals when network sources are explicitly enabled", async () => {
    const evidence = await buildCompetitorEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      includeNetworkSources: true,
      maxCompetitors: 1,
      maxPagesPerCompetitor: 2,
      maxTotalUrls: 2,
      fetcher: async () => ({
        ok: true,
        status: 200,
        text: async () => "<html><title>AI Agent Pricing</title><meta name=\"description\" content=\"AI agent workflow pricing and FAQ\"><body><h1>AI Agent Workflow Pack</h1><a>Pricing</a><button>Get started</button><section>FAQ</section><section>How to automate SEO research</section></body></html>"
      })
    });

    expect(evidence.dataSourceSummary.networkSourcesEnabled).toBe(true);
    expect(evidence.dataSourceSummary.pagesAttempted).toBe(2);
    expect(evidence.dataSourceSummary.pagesSucceeded).toBe(2);
    expect(evidence.competitorSummary.competitorsAuditedCount).toBe(1);
    expect(evidence.confidence).toBe("complete");
    expect(evidence.competitorAudits[0]).toMatchObject({
      pagesAudited: 2,
      productTypes: expect.arrayContaining(["AI Agent"]),
      pricingSignals: expect.arrayContaining(["pricing"]),
      funnelSignals: expect.arrayContaining(["CTA"])
    });
  });

  test("keeps confidence partial and warns when public URL audit success is too thin", async () => {
    const evidence = await buildCompetitorEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      includeNetworkSources: true,
      maxCompetitors: 2,
      maxPagesPerCompetitor: 2,
      maxTotalUrls: 4,
      fetcher: async (url) => {
        if (url.includes("pricing")) throw new Error("blocked");
        return {
          ok: true,
          status: 200,
          text: async () => "<html><title>Tool directory</title><body><h1>AI Tools</h1></body></html>"
        };
      }
    });

    expect(evidence.dataSourceSummary.pagesAttempted).toBe(4);
    expect(evidence.dataSourceSummary.pagesSucceeded).toBe(2);
    expect(evidence.dataSourceSummary.pagesFailed).toBe(2);
    expect(evidence.confidence).toBe("partial");
    expect(evidence.warnings).toContainEqual(expect.objectContaining({
      code: "competitor_public_audit_thin"
    }));
  });
});
