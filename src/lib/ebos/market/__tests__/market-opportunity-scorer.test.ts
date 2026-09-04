import { describe, expect, test } from "vitest";
import {
  calculateMarketOpportunityPriority,
  recommendProductFormats,
  scoreMarketOpportunities
} from "../market-opportunity-scorer";
import type { EbosMarketSignal } from "../market-evidence-types";

function signal(overrides: Partial<EbosMarketSignal> = {}): EbosMarketSignal {
  return {
    id: "signal-1",
    source: "manual",
    sourceType: "manual",
    title: "AI Agent workflow templates for SEO automation",
    description: "Teams need templates to save time, create content growth, and commercialize AI workflows.",
    tags: ["AI Agent", "workflow"],
    detectedTopics: ["ai_agent", "workflow", "seo_geo", "automation"],
    detectedProductTypes: ["workflow_pack", "prompt_kit", "seo_geo_content_cluster"],
    detectedUserProblems: ["save_time", "template_gap", "content_growth", "monetization_need"],
    relevanceScore: 92,
    freshnessScore: 70,
    monetizationScore: 80,
    confidence: "partial",
    ...overrides
  };
}

describe("market opportunity scorer", () => {
  test("calculates priority score from positive and negative factors", () => {
    expect(calculateMarketOpportunityPriority({
      demandScore: 25,
      monetizationPotential: 20,
      enheFitScore: 20,
      seoPotential: 15,
      geoPotential: 10,
      buildDifficulty: 0,
      competitionRisk: 0
    })).toBe(90);

    expect(calculateMarketOpportunityPriority({
      demandScore: 25,
      monetizationPotential: 20,
      enheFitScore: 20,
      seoPotential: 15,
      geoPotential: 10,
      buildDifficulty: 10,
      competitionRisk: 10
    })).toBe(70);
  });

  test("recommends build_now for high-priority opportunities", () => {
    const opportunities = scoreMarketOpportunities([signal()], {
      firstRevenueAchieved: true
    });

    expect(opportunities[0]?.priorityScore).toBeGreaterThanOrEqual(80);
    expect(opportunities[0]?.recommendedAction).toBe("build_now");
  });

  test("downgrades high-priority opportunities to validate_first before first revenue", () => {
    const opportunities = scoreMarketOpportunities([signal()], {
      firstRevenueAchieved: false
    });

    expect(opportunities[0]?.priorityScore).toBeGreaterThanOrEqual(65);
    expect(opportunities[0]?.recommendedAction).toBe("validate_first");
    expect(opportunities[0]?.nextActions.some((action) => action.includes("低成本"))).toBe(true);
  });

  test("recommends product formats from opportunity topics", () => {
    expect(recommendProductFormats({
      productDirection: "AI Agent SEO workflow pack",
      detectedTopics: ["ai_agent", "seo_geo", "workflow"],
      detectedProductTypes: ["workflow_pack", "prompt_kit"]
    })).toEqual(expect.arrayContaining([
      "Workflow Pack",
      "Prompt Kit",
      "SEO/GEO Content Cluster"
    ]));
  });
});
