import { describe, expect, test } from "vitest";
import { buildEbosDecisionReport } from "../decision-report-builder";
import type { EbosEvidenceDecisionInput } from "../decision-types";

function decisionInput(): EbosEvidenceDecisionInput {
  return {
    marketEvidence: {
      recommendedProductDirections: [
        {
          id: "prompt-kit",
          productDirection: "AI Prompt Kit",
          description: "Prompt kit for operators.",
          priorityScore: 76,
          suggestedProductFormats: ["Prompt Kit"],
          suggestedPriceRange: "CNY 9-99",
          nextActions: ["Create landing page"]
        },
        {
          id: "ai-agent",
          productDirection: "AI Agent 工作流模板包",
          description: "Agent workflow templates.",
          priorityScore: 74,
          suggestedProductFormats: ["Workflow Pack"],
          suggestedPriceRange: "CNY 9-99",
          nextActions: ["Create content test"]
        }
      ]
    },
    competitorEvidence: {
      differentiationOpportunities: [
        {
          title: "Validate AI Prompt Kit differentiation",
          priorityScore: 72,
          relatedMarketDirections: ["AI Prompt Kit"],
          risks: ["Competitor signals do not prove demand."]
        }
      ]
    },
    productEvidence: {
      overallScore: 91,
      productAudits: [
        {
          productName: "AI Video Studio",
          slug: "ai-video-studio",
          score: 100,
          conversionReadinessScore: 100,
          deliveryReadinessScore: 100,
          risks: []
        }
      ]
    },
    revenueEvidence: {
      revenueSummary: { firstRevenueAchieved: false },
      productRevenueSummary: {
        recommendedValidationProducts: [
          { productName: "AI Video Studio", productSlug: "ai-video-studio", revenueReadinessScore: 75, risks: [] }
        ]
      }
    },
    seoEvidence: { overallScore: 82 },
    geoEvidence: { overallScore: 78 }
  };
}

describe("decision report builder", () => {
  test("builds a focused decision report from complete decision input", async () => {
    const report = await buildEbosDecisionReport({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      input: decisionInput(),
      evidenceUsed: [
        { evidenceKind: "market_evidence", filePath: "market.json", targetDate: "2026-07-03", confidence: "partial", score: 76 },
        { evidenceKind: "competitor_evidence", filePath: "competitor.json", targetDate: "2026-07-03", confidence: "partial", score: 69 }
      ]
    });

    expect(report.reportType).toBe("decision");
    expect(report.priorityProductDirections[0]?.name).toBe("AI Prompt Kit");
    expect(report.priorityExistingProducts[0]?.productName).toBe("AI Video Studio");
    expect(report.validationPlans.length).toBeGreaterThan(0);
    expect(report.doNext).toHaveLength(2);
    expect(report.stopDoing.map((item) => item.title)).toEqual(expect.arrayContaining([
      expect.stringContaining("UI"),
      expect.stringContaining("too many products"),
      expect.stringContaining("heavy development")
    ]));
    expect(report.codexTasks.length).toBeGreaterThan(0);
    expect(report.risks.join(" ")).toContain("does not fabricate");
  });

  test("does not crash when catalog-backed evidence is missing", async () => {
    const report = await buildEbosDecisionReport({
      targetDate: "2026-07-03",
      input: { marketEvidence: { recommendedProductDirections: [] } },
      dataGaps: ["Missing revenue_evidence."]
    });

    expect(report.overallConfidence).toBe("partial");
    expect(report.dataGaps).toContainEqual(expect.stringContaining("revenue_evidence"));
    expect(report.doNext.length).toBeLessThanOrEqual(2);
  });
});
