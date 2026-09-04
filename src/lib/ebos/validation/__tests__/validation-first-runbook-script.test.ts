import { describe, expect, test } from "vitest";
import { renderFirstValidationRunbookMarkdown } from "../../../../../scripts/generate-ebos-first-validation-runbook";
import type { EbosValidationExecutionInput, EbosValidationExecutionPlan } from "../../validation-execution";

function executionPlan(
  planId: string,
  title: string,
  targetDirection: string
): EbosValidationExecutionPlan {
  return {
    planId,
    title,
    targetDirection,
    validationMethod: "landing_page",
    objective: `Validate ${title}.`,
    hypothesis: `${title} can produce observed demand.`,
    successMetric: "CTA clicks, leads, or orders.",
    minimumSuccessThreshold: "CTA clicks >= 10 or leads >= 3 or presale orders >= 1.",
    durationDays: 7,
    executionStatus: "not_started",
    marketplaceListingUrls: [],
    contentTestUrls: [],
    outreachTargets: [],
    trackingFields: [
      {
        key: "ctaClicks",
        label: "CTA clicks",
        type: "number",
        required: true,
        description: "Observed CTA clicks.",
        example: 0
      }
    ],
    codexTasks: [`Prepare ${title} validation asset.`],
    humanTasks: [`Record observed ${title} results.`],
    acceptanceCriteria: ["Observed results are written without fabricated metrics."],
    resultInputTemplate: {
      planId,
      status: "not_started",
      ctaClicks: 0
    }
  };
}

function executionInput(): EbosValidationExecutionInput {
  return {
    inputType: "validation_execution_input",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    decisionReportPath: "reports/ebos/decision/2026-07-03-decision-report.json",
    validationTrackerPath: "reports/ebos/validation/templates/2026-07-03-validation-tracker.json",
    validationResultInputPath: "reports/ebos/validation/inputs/2026-07-03-validation-input.json",
    executionPlans: [
      executionPlan("plan-1", "AI Prompt Kit", "AI Prompt Kit"),
      executionPlan("plan-2", "FaceSwap Studio", "Existing product validation"),
      executionPlan("plan-3", "AI Video Studio", "Existing product validation")
    ],
    channelTracking: [],
    resultRecordingRules: ["Do not fabricate CTA clicks, leads, orders, revenue, refunds, or feedback."],
    weeklyReviewQuestions: [],
    warnings: []
  };
}

describe("first validation runbook script", () => {
  test("renders the three validation plans and execution rules", () => {
    const markdown = renderFirstValidationRunbookMarkdown(executionInput());

    expect(markdown).toContain("AI Prompt Kit");
    expect(markdown).toContain("FaceSwap Studio");
    expect(markdown).toContain("AI Video Studio");
    expect(markdown).toContain("Codex tasks");
    expect(markdown).toContain("User tasks");
    expect(markdown).toContain("3-day");
    expect(markdown).toContain("7-day");
    expect(markdown).toContain("Do not fabricate");
  });
});
