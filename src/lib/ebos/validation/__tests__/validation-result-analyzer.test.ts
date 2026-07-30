import { describe, expect, test } from "vitest";
import {
  analyzeSingleValidationPlan,
  analyzeValidationResults,
  calculateValidationScore,
  evaluateSeoAuditFirstWeekValidation
} from "../validation-result-analyzer";
import type {
  EbosValidationPlanTracker,
  EbosValidationResultInput,
  EbosValidationTracker
} from "../validation-types";

function plan(overrides: Partial<EbosValidationPlanTracker> = {}): EbosValidationPlanTracker {
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
    requiredAssets: [],
    codexTasks: ["Draft validation page"],
    humanTasks: ["Follow up leads"],
    risks: [],
    resultInput: { planId: "plan-1", status: "not_started" },
    ...overrides
  };
}

function analyze(result: Partial<EbosValidationResultInput>) {
  return analyzeSingleValidationPlan(plan(), {
    planId: "plan-1",
    status: "completed",
    ...result
  });
}

describe("validation result analyzer", () => {
  test("marks not-started plans with score 0", () => {
    const analysis = analyzeSingleValidationPlan(plan(), { planId: "plan-1", status: "not_started" });

    expect(analysis.score).toBe(0);
    expect(analysis.successStatus).toBe("not_started");
    expect(analysis.decisionRecommendation).toBe("needs_more_data");
  });

  test("treats CTA clicks or leads without orders as partial success", () => {
    const analysis = analyze({ ctaClicks: 6, leads: 2 });

    expect(analysis.successStatus).toBe("partial_success");
    expect(analysis.decisionRecommendation).toBe("adjust");
  });

  test("treats presale or paid orders as success", () => {
    expect(analyze({ presaleOrders: 1 }).successStatus).toBe("success");
    expect(analyze({ paidOrders: 1 }).successStatus).toBe("success");
  });

  test("revenue without a measured cash CAC cannot become a scale recommendation", () => {
    const analysis = analyze({ paidOrders: 2, revenue: 199, refundCount: 0 });

    expect(analysis.successStatus).toBe("success");
    expect(analysis.decisionRecommendation).toBe("continue");
    expect(calculateValidationScore(plan(), analysis.resultInput)).toBeGreaterThanOrEqual(85);
  });

  test("paid orders with a refund rate above ten percent stop validation", () => {
    const analysis = analyze({ paidOrders: 2, revenue: 199, refundCount: 2 });

    expect(analysis.successStatus).toBe("failed");
    expect(analysis.decisionRecommendation).toBe("stop");
    expect(analysis.warnings.join(" ")).toContain("refund");
  });

  test("actual metric at threshold is success", () => {
    const analysis = analyze({ actualMetricValue: 10, actualMetricLabel: "CTA clicks" });

    expect(analysis.successStatus).toBe("success");
  });

  test("below threshold with positive feedback is partial success", () => {
    const analysis = analyze({ actualMetricValue: 4, userFeedback: ["I would buy this for my team"] });

    expect(analysis.successStatus).toBe("partial_success");
  });

  test("completed plan with no recorded fields is treated as not started", () => {
    const analysis = analyze({});

    expect(analysis.successStatus).toBe("not_started");
    expect(analysis.decisionRecommendation).toBe("needs_more_data");
    expect(analysis.score).toBe(0);
  });

  test("treats marketplace messages without orders as partial success", () => {
    const analysis = analyze({ listingViews: 80, messages: 3, paidOrders: 0 });

    expect(analysis.successStatus).toBe("partial_success");
    expect(analysis.decisionRecommendation).toBe("adjust");
    expect(analysis.channelAttributionSummary.summary.join(" ")).toContain("marketplace");
  });

  test("treats product page CTA clicks without leads as inconclusive adjustment", () => {
    const analysis = analyze({
      productPageViews: 120,
      productPageCtaClicks: 12,
      leads: 0,
      paidOrders: 0
    });

    expect(analysis.successStatus).toBe("inconclusive");
    expect(analysis.decisionRecommendation).toBe("adjust");
    expect(analysis.nextActions.join(" ")).toContain("consultation");
  });

  test("paid orders without refunds are success", () => {
    const analysis = analyze({ paidOrders: 1, refundCount: 0 });

    expect(analysis.successStatus).toBe("success");
  });

  test("paid orders with any refund are partial success", () => {
    const analysis = analyze({ paidOrders: 3, revenue: 99, refundCount: 1 });

    expect(analysis.successStatus).toBe("failed");
    expect(analysis.decisionRecommendation).toBe("stop");
    expect(analysis.nextActions.join(" ")).toContain("refund");
  });

  test("enforces first-week budget, scan, refund, factual-error, delivery, and CAC gates", () => {
    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 2,
      completedScans: 50,
      channelSpend: 20,
      totalValidationSpend: 20,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    }).decision).toBe("pause");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 151,
      totalValidationSpend: 151,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    }).decision).toBe("pause");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 20,
      totalValidationSpend: 501,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    }).decision).toBe("stop");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 8,
      completedScans: 40,
      channelSpend: 30,
      totalValidationSpend: 30,
      refundCount: 1,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    }).decision).toBe("stop");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 20,
      totalValidationSpend: 20,
      refundCount: 0,
      factualErrorCount: 2,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    }).decision).toBe("stop");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 20,
      totalValidationSpend: 20,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 1,
      pendingRefundOrders: 0
    }).decision).toBe("stop");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 20,
      totalValidationSpend: 20,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 1
    }).decision).toBe("stop");

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 21,
      totalValidationSpend: 21,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    })).toMatchObject({ decision: "scale", cashCac: 7 });

    expect(evaluateSeoAuditFirstWeekValidation({
      paidOrders: 3,
      completedScans: 40,
      channelSpend: 21.01,
      totalValidationSpend: 21.01,
      refundCount: 0,
      factualErrorCount: 0,
      factCheckedItems: 20,
      undeliveredPaidOrders: 0,
      pendingRefundOrders: 0
    }).decision).toBe("continue");
  });

  test("builds aggregate result report buckets", () => {
    const tracker: EbosValidationTracker = {
      trackerType: "validation_tracker",
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      generatedAt: "2026-07-03T00:00:00.000Z",
      decisionReportPath: "decision.json",
      topPriorityDirection: "AI Prompt Kit",
      validationPlans: [plan({ id: "plan-1", resultInput: { planId: "plan-1", status: "not_started" } })],
      instructions: [],
      manualInputSchema: { results: [] },
      warnings: []
    };

    const report = analyzeValidationResults(tracker, {
      results: [{ planId: "plan-1", status: "completed", paidOrders: 1 }]
    }, {
      trackerPath: "tracker.json",
      inputPath: "input.json",
      generatedAt: "2026-07-04T00:00:00.000Z"
    });

    expect(report.reportType).toBe("validation_result_report");
    expect(report.overallValidationScore).toBeGreaterThan(0);
    expect(report.continueDirections).toContain("AI Prompt Kit");
    expect(report.codexTasks).toContainEqual(expect.stringContaining("Draft validation page"));
    expect(report.analyses[0]?.inputCompleteness.completenessPercent).toBeGreaterThan(0);
    expect(report.analyses[0]?.channelAttributionSummary.channels.length).toBe(4);
  });
});
