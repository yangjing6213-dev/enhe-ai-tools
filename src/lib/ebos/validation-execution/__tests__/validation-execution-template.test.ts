import { describe, expect, test } from "vitest";
import {
  buildExecutionPlanFromTrackerPlan,
  buildValidationExecutionInput,
  createResultInputTemplateForExecutionPlan
} from "../validation-execution-template";
import type { EbosValidationPlanTracker, EbosValidationTracker } from "../../validation";

function tracker(): EbosValidationTracker {
  return {
    trackerType: "validation_tracker",
    targetDate: "2026-07-03",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generatedAt: "2026-07-03T00:00:00.000Z",
    decisionReportPath: "reports/ebos/decision/2026-07-03-decision-report.json",
    topPriorityDirection: "AI Prompt Kit",
    topExistingProduct: "FaceSwap Studio",
    validationPlans: [
      plan({
        id: "validation-direction-3-ai-prompt-kit",
        title: "Validate AI Prompt Kit",
        targetDirection: "AI Prompt Kit",
        validationMethod: "landing_page"
      }),
      plan({
        id: "validation-product-1-faceswap-studio-ai",
        title: "Validate existing product: FaceSwap Studio",
        targetDirection: "Existing product revenue validation",
        targetProduct: "FaceSwap Studio",
        validationMethod: "pricing_test"
      })
    ],
    instructions: [],
    manualInputSchema: {},
    warnings: []
  };
}

function plan(overrides: Partial<EbosValidationPlanTracker>): EbosValidationPlanTracker {
  return {
    id: "plan-1",
    title: "Validate AI Prompt Kit",
    targetDirection: "AI Prompt Kit",
    objective: "Validate demand.",
    hypothesis: "Users will click or buy.",
    validationMethod: "landing_page",
    successMetric: "CTA clicks, leads, or orders.",
    minimumSuccessThreshold: "CTA clicks >= 10 or leads >= 3 or presale orders >= 1.",
    durationDays: 7,
    requiredAssets: ["Landing page"],
    codexTasks: ["Draft validation page"],
    humanTasks: ["Share validation page"],
    risks: ["Signals are directional."],
    resultInput: { planId: "plan-1", status: "not_started" },
    ...overrides
  };
}

function fakeFs(files: Record<string, string>) {
  return {
    readFile: async (filePath: string) => files[filePath],
    readdir: async (directory: string) => Object.keys(files)
      .filter((filePath) => filePath.startsWith(`${directory}/`))
      .map((filePath) => filePath.slice(directory.length + 1))
  };
}

describe("validation execution template", () => {
  test("builds execution input from tracker plans", async () => {
    const input = await buildValidationExecutionInput({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T08:00:00.000Z",
      tracker: tracker(),
      validationTrackerPath: "reports/ebos/validation/templates/2026-07-03-validation-tracker.json",
      validationResultInputPath: "reports/ebos/validation/inputs/2026-07-03-validation-input.json"
    });

    expect(input.inputType).toBe("validation_execution_input");
    expect(input.executionPlans).toHaveLength(2);
    expect(input.executionPlans[0]?.resultInputTemplate).toMatchObject({
      planId: "validation-direction-3-ai-prompt-kit",
      status: "not_started"
    });
    expect(input.channelTracking.length).toBeGreaterThan(0);
  });

  test("does not crash when source files are missing", async () => {
    const input = await buildValidationExecutionInput({
      targetDate: "2026-07-03",
      fs: fakeFs({})
    });

    expect(input.executionPlans).toEqual([]);
    expect(input.warnings).toContainEqual(expect.objectContaining({
      code: expect.stringContaining("missing")
    }));
  });

  test("AI Prompt Kit plan includes landing page, marketplace, and presale fields", () => {
    const executionPlan = buildExecutionPlanFromTrackerPlan(plan({
      id: "validation-direction-3-ai-prompt-kit",
      targetDirection: "AI Prompt Kit",
      validationMethod: "landing_page"
    }));

    expect(executionPlan.trackingFields.map((field) => field.key)).toEqual(expect.arrayContaining([
      "pageViews",
      "ctaClicks",
      "leads",
      "conversionRate",
      "listingViews",
      "messages",
      "presaleOrders",
      "paidOrders",
      "revenue"
    ]));
  });

  test("existing product plans include product page, pricing, and delivery tracking", () => {
    const executionPlan = buildExecutionPlanFromTrackerPlan(plan({
      id: "validation-product-1-faceswap-studio-ai",
      title: "Validate existing product: FaceSwap Studio",
      targetDirection: "Existing product revenue validation",
      targetProduct: "FaceSwap Studio",
      validationMethod: "pricing_test"
    }));

    expect(executionPlan.trackingFields.map((field) => field.key)).toEqual(expect.arrayContaining([
      "productPageViews",
      "priceShown",
      "ctaClicks",
      "paidOrders",
      "refundCount",
      "deliveryFeedback"
    ]));
    expect(executionPlan.acceptanceCriteria.join(" ")).toContain("delivery");
  });

  test("creates a zero-value result input template without fabricated results", () => {
    const executionPlan = buildExecutionPlanFromTrackerPlan(plan({ validationMethod: "presale" }));
    const template = createResultInputTemplateForExecutionPlan(executionPlan);

    expect(template.status).toBe("not_started");
    expect(template.paidOrders).toBe(0);
    expect(template.revenue).toBe(0);
    expect(template.userFeedback).toEqual([]);
  });
});
