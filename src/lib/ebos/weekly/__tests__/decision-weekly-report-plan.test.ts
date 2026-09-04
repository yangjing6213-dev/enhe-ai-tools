import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";
import type { EbosDecisionReport } from "../../decision";

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

describe("weekly plan decision report integration", () => {
  test("uses decision report top recommendation when present", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, decisionReport());

    expect(plan.okrs[0]?.objective).toContain("AI Prompt Kit");
    expect(plan.actionItems[0]).toMatchObject({
      title: expect.stringContaining("Validate AI Prompt Kit"),
      sectionKey: "next_plan"
    });
  });
});
