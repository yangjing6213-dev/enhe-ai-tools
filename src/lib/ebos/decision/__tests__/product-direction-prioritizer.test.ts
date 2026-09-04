import { describe, expect, test } from "vitest";
import {
  prioritizeExistingProducts,
  prioritizeProductDirections
} from "../product-direction-prioritizer";
import type { EbosEvidenceDecisionInput } from "../decision-types";

function input(): EbosEvidenceDecisionInput {
  return {
    marketEvidence: {
      recommendedProductDirections: [
        {
          id: "prompt-kit",
          productDirection: "AI Prompt Kit",
          description: "Prompt templates for operators.",
          priorityScore: 74,
          recommendedAction: "validate_first",
          suggestedProductFormats: ["Prompt Kit", "Template Pack"],
          suggestedPriceRange: "CNY 9-99",
          risks: [],
          nextActions: ["Create landing page"]
        },
        {
          id: "local-desktop",
          productDirection: "Local desktop AI software",
          description: "Heavy local desktop software.",
          priorityScore: 78,
          recommendedAction: "build_now",
          suggestedProductFormats: ["Software Tool"],
          suggestedPriceRange: "CNY 99-399",
          risks: ["Heavy build"],
          nextActions: ["Build app"]
        }
      ]
    },
    competitorEvidence: {
      differentiationOpportunities: [
        {
          title: "Validate AI Prompt Kit differentiation",
          priorityScore: 72,
          relatedMarketDirections: ["AI Prompt Kit"],
          recommendedAction: "validate_first",
          risks: ["Competitor signals do not prove revenue."]
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
          {
            productName: "AI Video Studio",
            productSlug: "ai-video-studio",
            revenueReadinessScore: 75,
            risks: []
          }
        ]
      }
    },
    seoEvidence: { overallScore: 82 },
    geoEvidence: { overallScore: 78 }
  };
}

describe("product direction prioritizer", () => {
  test("boosts directions when market and competitor evidence point to the same low-cost validation topic", () => {
    const priorities = prioritizeProductDirections(input());
    const promptKit = priorities.find((item) => item.name === "AI Prompt Kit");

    expect(promptKit).toMatchObject({
      competitorScore: 15,
      revenueUrgencyScore: 15,
      recommendation: "validate_this_week"
    });
    expect(priorities[0]?.name).toBe("AI Prompt Kit");
  });

  test("downgrades heavy software directions when first revenue is not achieved", () => {
    const priorities = prioritizeProductDirections(input());
    const heavy = priorities.find((item) => item.name === "Local desktop AI software");

    expect(heavy?.buildDifficultyScore).toBeGreaterThanOrEqual(8);
    expect(heavy?.recommendation).not.toBe("validate_this_week");
    expect(heavy?.risks.join(" ")).toContain("first revenue");
  });

  test("prioritizes existing high-readiness products when revenue is still unproven", () => {
    const products = prioritizeExistingProducts(input());
    const top = products[0];

    expect(top).toMatchObject({
      productName: "AI Video Studio",
      revenueStatus: "first_revenue_not_achieved",
      recommendation: "validate_this_week"
    });
    expect(top?.totalPriorityScore).toBeGreaterThanOrEqual(70);
  });

  test("recommends fixing product page or delivery first when conversion risks exist", () => {
    const products = prioritizeExistingProducts({
      ...input(),
      productEvidence: {
        productAudits: [
          {
            productName: "Risky Product",
            slug: "risky",
            score: 62,
            conversionReadinessScore: 40,
            deliveryReadinessScore: 50,
            risks: ["Missing price and purchase configuration."]
          }
        ]
      },
      revenueEvidence: {
        revenueSummary: { firstRevenueAchieved: false },
        productRevenueSummary: { recommendedValidationProducts: [] }
      }
    });

    expect(products[0]).toMatchObject({
      productName: "Risky Product",
      recommendation: "fix_product_page_first"
    });
  });
});
