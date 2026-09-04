import { describe, expect, test } from "vitest";
import {
  identifyContentGaps,
  identifyPricingGaps,
  identifyProductGaps,
  rankCompetitorOpportunities,
  scoreCompetitorOpportunities
} from "../competitor-opportunity-scorer";
import type {
  EbosCompetitorAudit,
  EbosCompetitorOpportunity
} from "../competitor-evidence-types";

function audit(overrides: Partial<EbosCompetitorAudit> = {}): EbosCompetitorAudit {
  return {
    competitorId: "futurepedia",
    name: "Futurepedia",
    url: "https://www.futurepedia.io",
    category: "ai_tool_directory",
    pagesAudited: 2,
    averageScore: 82,
    positioningSummary: "AI agent and workflow marketplace",
    productTypes: ["AI Agent", "Workflow Pack", "Prompt Kit"],
    pricingSignals: ["pricing", "subscription"],
    seoStrengths: ["title", "meta description"],
    geoStrengths: ["faq", "how-to", "author"],
    funnelSignals: ["CTA", "newsletter"],
    observedAdvantages: ["Clear marketplace positioning"],
    observedWeaknesses: ["No ENHE-specific localization"],
    enheDifferentiationAngles: ["Package workflow templates with Chinese/English SEO/GEO landing pages"],
    warnings: [],
    ...overrides
  };
}

describe("competitor opportunity scorer", () => {
  test("identifies product, content, and pricing gaps from competitor audits", () => {
    const audits = [audit()];

    expect(identifyProductGaps(audits, undefined, undefined)).toContainEqual(expect.objectContaining({
      opportunityType: "product_gap"
    }));
    expect(identifyContentGaps(audits, undefined, undefined)).toContainEqual(expect.objectContaining({
      opportunityType: "content_gap"
    }));
    expect(identifyPricingGaps(audits, { revenueSummary: { firstRevenueAchieved: false } })).toContainEqual(expect.objectContaining({
      opportunityType: "pricing_gap"
    }));
  });

  test("uses market evidence and first-revenue status to prefer validation work", () => {
    const opportunities = scoreCompetitorOpportunities({
      competitorAudits: [audit()],
      marketEvidence: {
        recommendedProductDirections: [{
          productDirection: "AI Agent 工作流模板包",
          priorityScore: 76,
          recommendedAction: "validate_first"
        }]
      },
      revenueEvidence: {
        revenueSummary: {
          firstRevenueAchieved: false
        }
      }
    });

    expect(opportunities[0]).toMatchObject({
      recommendedAction: "validate_first",
      relatedMarketDirections: expect.arrayContaining(["AI Agent 工作流模板包"])
    });
    expect(opportunities[0]?.priorityScore).toBeGreaterThanOrEqual(65);
  });

  test("ranking rewards fit and penalizes high difficulty and risk", () => {
    const opportunities: EbosCompetitorOpportunity[] = [
      {
        id: "hard",
        title: "Hard build",
        description: "High risk build",
        relatedCompetitors: ["A"],
        relatedMarketDirections: [],
        opportunityType: "product_gap",
        priorityScore: 70,
        enheFitScore: 18,
        difficultyScore: 9,
        riskScore: 9,
        recommendedAction: "validate_first",
        suggestedCodexTasks: [],
        risks: []
      },
      {
        id: "fit",
        title: "Strong fit",
        description: "Low risk validation",
        relatedCompetitors: ["B"],
        relatedMarketDirections: [],
        opportunityType: "content_gap",
        priorityScore: 70,
        enheFitScore: 24,
        difficultyScore: 2,
        riskScore: 2,
        recommendedAction: "validate_first",
        suggestedCodexTasks: [],
        risks: []
      }
    ];

    expect(rankCompetitorOpportunities(opportunities)[0]?.id).toBe("fit");
  });
});
