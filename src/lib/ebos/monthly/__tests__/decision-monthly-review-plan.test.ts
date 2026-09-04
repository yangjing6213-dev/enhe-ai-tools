import { describe, expect, test } from "vitest";
import type { EbosDecisionReport } from "../../decision";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";

function decisionReport(): EbosDecisionReport {
  return {
    reportType: "decision",
    targetDate: "2026-07-03",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generatedAt: "2026-07-03T00:00:00.000Z",
    evidenceCatalogPath: "catalog.json",
    evidenceUsed: [],
    overallConfidence: "partial",
    strategicSummary: "本周优先验证 AI Prompt Kit。",
    priorityProductDirections: [],
    priorityExistingProducts: [],
    validationPlans: [],
    stopDoing: [],
    doNext: [{ title: "Validate AI Prompt Kit", reason: "Top cross-evidence priority.", evidenceRefs: [] }],
    codexTasks: [],
    risks: [],
    warnings: [],
    dataGaps: []
  };
}

describe("monthly plan decision report integration", () => {
  test("references decision report validation direction when present", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      decisionReport: decisionReport()
    });

    expect(plan.nextMonthOKRs[0]?.objective).toContain("AI Prompt Kit");
    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("decision report")
    }));
  });
});
