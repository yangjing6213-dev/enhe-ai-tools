import { describe, expect, it } from "vitest";
import type { EbosValidationResultReport } from "../../validation";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";

describe("monthly plan validation capture integration", () => {
  it("prompts for external channel data when capture report has manual slots", () => {
    const validationReport = {
      reportType: "validation_result_report",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      trackerPath: "tracker.json",
      analyses: [],
      overallValidationScore: 15,
      summary: "capture exists",
      continueDirections: [],
      adjustDirections: ["AI Prompt Kit"],
      stopDirections: [],
      scaleDirections: [],
      codexTasks: [],
      humanTasks: [],
      warnings: [],
      captureReportPath: "reports/ebos/validation/capture/2026-07-03-validation-capture-report.json",
      captureSummary: {
        analyticsAvailable: true,
        eventsDetected: 1,
        ctaClicksDetected: 1,
        ordersAvailable: true,
        paidOrders: 0,
        revenue: 0,
        refundCount: 0,
        manualSlotsCount: 7,
        warnings: []
      }
    } satisfies EbosValidationResultReport;

    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      validationResultReport: validationReport
    });

    expect(plan.codexTasks.some((task) => task.title.includes("外部渠道"))).toBe(true);
  });
});
