import { describe, expect, test } from "vitest";
import { renderValidationResultReportMarkdown } from "../validation-report-markdown";
import type { EbosValidationResultReport } from "../validation-types";

function report(overrides: Partial<EbosValidationResultReport> = {}): EbosValidationResultReport {
  return {
    reportType: "validation_result_report",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    trackerPath: "reports/ebos/validation/templates/2026-07-03-validation-tracker.json",
    inputPath: undefined,
    analyses: [{
      planId: "plan-1",
      title: "Validate AI Prompt Kit",
      targetDirection: "AI Prompt Kit",
      status: "not_started",
      successStatus: "not_started",
      score: 0,
      resultInput: { planId: "plan-1", status: "not_started" },
      evidenceSummary: ["尚未开始或尚未记录结果"],
      channelAttributionSummary: {
        planId: "plan-1",
        channels: [],
        summary: ["No channel data recorded."],
        recommendations: ["Record observed channel metrics before the next run."]
      },
      inputCompleteness: {
        totalPlans: 1,
        completedPlans: 0,
        plansWithAnySignal: 0,
        totalTrackableFields: 0,
        filledTrackableFields: 0,
        completenessPercent: 0,
        level: "empty",
        suggestedFieldsToFill: { "plan-1": ["pageViews", "ctaClicks", "leads"] }
      },
      dataQualityWarnings: ["Record actual channel metrics before judging demand."],
      decisionRecommendation: "needs_more_data",
      reason: "No result input was recorded.",
      nextActions: ["Record CTA clicks, leads, orders, revenue, and notes."],
      risks: [],
      warnings: []
    }],
    overallValidationScore: 0,
    summary: "尚未开始或尚未记录结果。",
    continueDirections: [],
    adjustDirections: [],
    stopDirections: [],
    scaleDirections: [],
    codexTasks: ["Keep tracker ready"],
    humanTasks: ["Fill validation input"],
    warnings: [],
    ...overrides
  };
}

describe("validation result markdown", () => {
  test("renders the required 11 headings", () => {
    const markdown = renderValidationResultReportMarkdown(report());

    expect(markdown).toContain("# ENHE Validation Result Report");
    for (const heading of [
      "## 1. 验证结果总览",
      "## 2. 本轮验证计划",
      "## 3. 结果填写情况",
      "## 4. 单项验证分析",
      "## 5. 应该继续的方向",
      "## 6. 应该调整的方向",
      "## 7. 应该停止的方向",
      "## 8. 可以放大的方向",
      "## 9. Codex 下一步任务",
      "## 10. 人工下一步任务",
      "## 11. 风险与数据不足"
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("states clearly when no input has been recorded", () => {
    const markdown = renderValidationResultReportMarkdown(report());

    expect(markdown).toContain("尚未开始或尚未记录结果");
    expect(markdown).not.toContain("CTA clicks: 10");
    expect(markdown).not.toContain("Revenue: 99");
  });

  test("includes Codex and human tasks without fabricating metrics", () => {
    const markdown = renderValidationResultReportMarkdown(report({
      analyses: [{
        ...report().analyses[0]!,
        status: "completed",
        successStatus: "success",
        score: 90,
        resultInput: { planId: "plan-1", status: "completed", paidOrders: 1 },
        evidenceSummary: ["Paid orders: 1"],
        decisionRecommendation: "continue",
        reason: "At least one paid order was recorded."
      }],
      overallValidationScore: 90,
      continueDirections: ["AI Prompt Kit"]
    }));

    expect(markdown).toContain("Paid orders: 1");
    expect(markdown).toContain("Keep tracker ready");
    expect(markdown).toContain("Fill validation input");
    expect(markdown).not.toContain("Leads: 0");
  });

  test("includes channel attribution, completeness, data quality, and next-run recording guidance", () => {
    const markdown = renderValidationResultReportMarkdown(report());

    expect(markdown).toContain("Channel attribution");
    expect(markdown).toContain("Input completeness");
    expect(markdown).toContain("Data quality reminders");
    expect(markdown).toContain("Next-run recording suggestions");
    expect(markdown).toContain("No channel data recorded.");
    expect(markdown).toContain("Record actual channel metrics before judging demand.");
  });

  test("includes validation capture summary when provided", () => {
    const markdown = renderValidationResultReportMarkdown(report({
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
    }));

    expect(markdown).toContain("Capture summary");
    expect(markdown).toContain("manualSlots=7");
    expect(markdown).toContain("外部渠道数据仍需补充");
  });

  test("includes external intake status when template exists but has not been filled", () => {
    const markdown = renderValidationResultReportMarkdown(report({
      externalIntakeSummary: {
        status: "template_generated_unfilled",
        inputPath: "reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json",
        templatePath: "reports/ebos/validation/intake/templates/2026-07-03-external-intake-template.json",
        importedChannelsCount: 0,
        importedPlansCount: 0,
        appliedChangesCount: 0,
        skippedChangesCount: 0,
        warnings: [],
        summary: "已生成填报模板，但尚未填写真实外部渠道数据"
      }
    }));

    expect(markdown).toContain("External intake");
    expect(markdown).toContain("template_generated_unfilled");
    expect(markdown).toContain("已生成填报模板，但尚未填写真实外部渠道数据");
  });
});
