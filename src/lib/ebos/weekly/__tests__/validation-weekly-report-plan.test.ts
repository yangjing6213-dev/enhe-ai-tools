import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";
import type { EbosValidationResultReport } from "../../validation";
import type { EbosValidationLaunchReadinessReport } from "../../validation-launch";

function validationReport(overrides: Partial<EbosValidationResultReport> = {}): EbosValidationResultReport {
  return {
    reportType: "validation_result_report",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    trackerPath: "tracker.json",
    analyses: [],
    overallValidationScore: 0,
    summary: "尚未开始或尚未记录结果。",
    continueDirections: [],
    adjustDirections: [],
    stopDirections: [],
    scaleDirections: [],
    codexTasks: [],
    humanTasks: [],
    warnings: [],
    ...overrides
  };
}

function launchReadiness(overrides: Partial<EbosValidationLaunchReadinessReport> = {}): EbosValidationLaunchReadinessReport {
  return {
    reportType: "validation_launch_readiness",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    validationPages: [],
    assetFiles: [],
    trackingChecks: [],
    seoGeoChecks: [],
    externalIntakeChecks: [],
    deploymentChecks: [],
    readinessScore: 90,
    readinessStatus: "ready",
    blockers: [],
    warnings: [],
    nextActions: [],
    ...overrides
  };
}

describe("weekly plan validation result integration", () => {
  test("prompts to record validation results when no validation result exists", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, null);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("记录验证结果")
    }));
  });

  test("prompts to record validation results when report has no completed input", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, validationReport());

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("记录验证结果")
    }));
  });

  test("references successful validation results when present", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, validationReport({
      overallValidationScore: 92,
      continueDirections: ["AI Prompt Kit"],
      scaleDirections: ["FaceSwap Studio"],
      analyses: [{
        planId: "plan-1",
        title: "Validate AI Prompt Kit",
        targetDirection: "AI Prompt Kit",
        status: "completed",
        successStatus: "success",
        score: 92,
        resultInput: { planId: "plan-1", status: "completed", paidOrders: 1 },
        evidenceSummary: ["Paid orders: 1"],
        channelAttributionSummary: {
          planId: "plan-1",
          channels: [],
          summary: [],
          recommendations: []
        },
        inputCompleteness: {
          totalPlans: 1,
          completedPlans: 1,
          plansWithAnySignal: 1,
          totalTrackableFields: 1,
          filledTrackableFields: 1,
          completenessPercent: 100,
          level: "high",
          suggestedFieldsToFill: { "plan-1": [] }
        },
        dataQualityWarnings: [],
        decisionRecommendation: "continue",
        reason: "Paid demand was recorded.",
        nextActions: [],
        risks: [],
        warnings: []
      }]
    }));

    expect(plan.okrs[0]?.objective).toContain("AI Prompt Kit");
    expect(plan.actionItems[0]?.description).toContain("validation result");
  });

  test("prompts when external intake template exists but is unfilled", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, validationReport({
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

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("external intake"),
      description: expect.stringContaining("已生成填报模板，但尚未填写真实外部渠道数据")
    }));
  });

  test("references imported external intake status", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, validationReport({
      externalIntakeSummary: {
        status: "imported",
        inputPath: "reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json",
        importReportPath: "reports/ebos/validation/intake/imports/2026-07-03-external-intake-import-report.json",
        importedChannelsCount: 3,
        importedPlansCount: 2,
        appliedChangesCount: 8,
        skippedChangesCount: 1,
        warnings: [],
        summary: "Imported external intake data."
      }
    }));

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("External intake imported"),
      description: expect.stringContaining("3 channels")
    }));
  });

  test("prioritizes launch readiness blockers", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, validationReport(), launchReadiness({
      readinessStatus: "blocked",
      readinessScore: 40,
      blockers: ["Missing validation page /validation/ai-prompt-kit"]
    }));

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Fix validation launch blockers"),
      description: expect.stringContaining("Missing validation page")
    }));
  });

  test("suggests real validation launch when readiness is ready", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, validationReport(), launchReadiness({
      readinessStatus: "ready",
      readinessScore: 92
    }));

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Start real validation launch"),
      description: expect.stringContaining("readinessStatus=ready")
    }));
  });
});
