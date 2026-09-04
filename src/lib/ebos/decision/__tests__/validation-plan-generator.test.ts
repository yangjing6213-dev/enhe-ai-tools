import { describe, expect, test } from "vitest";
import { generateValidationPlans } from "../validation-plan-generator";
import type {
  EbosPriorityExistingProduct,
  EbosPriorityProductDirection
} from "../decision-types";

const direction: EbosPriorityProductDirection = {
  id: "ai-prompt-kit",
  name: "AI Prompt Kit",
  description: "Prompt kit for operators.",
  sourceSignals: ["market", "competitor"],
  marketScore: 15,
  competitorScore: 15,
  productFitScore: 18,
  revenueUrgencyScore: 15,
  seoPotentialScore: 8,
  geoPotentialScore: 8,
  buildDifficultyScore: 1,
  validationSpeedScore: 10,
  totalPriorityScore: 88,
  recommendation: "validate_this_week",
  reason: "Fast validation.",
  risks: [],
  suggestedFormats: ["Prompt Kit"],
  suggestedPriceRange: "CNY 9-99",
  nextActions: ["Draft landing page"]
};

const product: EbosPriorityExistingProduct = {
  productName: "AI Video Studio",
  slug: "ai-video-studio",
  readinessScore: 100,
  revenueStatus: "first_revenue_not_achieved",
  seoGeoReadiness: "strong",
  conversionRisks: [],
  totalPriorityScore: 82,
  recommendation: "validate_this_week",
  reason: "High readiness but revenue is unproven.",
  nextActions: ["Run pricing test"]
};

describe("validation plan generator", () => {
  test("generates validation plans for the top three priorities with metrics and thresholds", () => {
    const plans = generateValidationPlans({
      priorityProductDirections: [
        direction,
        { ...direction, id: "seo-geo", name: "SEO/GEO 自动化内容集群", totalPriorityScore: 80 },
        { ...direction, id: "agent", name: "AI Agent 工作流模板包", totalPriorityScore: 78 },
        { ...direction, id: "extra", name: "Extra Direction", totalPriorityScore: 60 }
      ],
      priorityExistingProducts: []
    });

    expect(plans).toHaveLength(3);
    expect(plans[0]).toMatchObject({
      targetDirection: "AI Prompt Kit",
      validationMethod: "landing_page",
      minimumSuccessThreshold: expect.any(String)
    });
    expect(plans[0]?.codexTasks.length).toBeGreaterThan(0);
    expect(plans[0]?.humanTasks.length).toBeGreaterThan(0);
  });

  test("uses pricing tests for existing product validation plans", () => {
    const plans = generateValidationPlans({
      priorityProductDirections: [],
      priorityExistingProducts: [product]
    });

    expect(plans[0]).toMatchObject({
      targetProduct: "AI Video Studio",
      validationMethod: "pricing_test",
      successMetric: expect.stringContaining("CTA")
    });
  });
});
