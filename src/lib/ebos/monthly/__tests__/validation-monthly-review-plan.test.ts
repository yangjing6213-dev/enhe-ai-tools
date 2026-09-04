import { describe, expect, test } from "vitest";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";
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

describe("monthly plan validation result integration", () => {
  test("prompts to record validation results when no validation result exists", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      validationResultReport: null
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Record validation results")
    }));
  });

  test("prompts to record validation results when report has no completed input", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      validationResultReport: validationReport()
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Record validation results")
    }));
  });

  test("references success and failed validation results when present", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      validationResultReport: validationReport({
        continueDirections: ["AI Prompt Kit"],
        stopDirections: ["AI Video Studio"],
        analyses: [
          {
            planId: "plan-1",
            title: "Validate AI Prompt Kit",
            targetDirection: "AI Prompt Kit",
            status: "completed",
            successStatus: "success",
            score: 90,
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
          },
          {
            planId: "plan-2",
            title: "Validate AI Video Studio",
            targetDirection: "AI Video Studio",
            status: "completed",
            successStatus: "failed",
            score: 20,
            resultInput: { planId: "plan-2", status: "completed" },
            evidenceSummary: [],
            channelAttributionSummary: {
              planId: "plan-2",
              channels: [],
              summary: [],
              recommendations: []
            },
            inputCompleteness: {
              totalPlans: 1,
              completedPlans: 1,
              plansWithAnySignal: 0,
              totalTrackableFields: 0,
              filledTrackableFields: 0,
              completenessPercent: 0,
              level: "empty",
              suggestedFieldsToFill: { "plan-2": [] }
            },
            dataQualityWarnings: [],
            decisionRecommendation: "stop",
            reason: "No feedback was recorded.",
            nextActions: [],
            risks: [],
            warnings: []
          }
        ]
      })
    });

    expect(plan.keepDoing).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("AI Prompt Kit")
    }));
    expect(plan.stopDoing).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("AI Video Studio")
    }));
  });

  test("prompts when external intake template exists but is unfilled", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      validationResultReport: validationReport({
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
      })
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("external intake"),
      reason: expect.stringContaining("已生成填报模板，但尚未填写真实外部渠道数据")
    }));
  });

  test("references imported external intake status", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      validationResultReport: validationReport({
        externalIntakeSummary: {
          status: "imported",
          inputPath: "reports/ebos/validation/intake/inputs/2026-07-03-external-intake-input.json",
          importReportPath: "reports/ebos/validation/intake/imports/2026-07-03-external-intake-import-report.json",
          importedChannelsCount: 2,
          importedPlansCount: 2,
          appliedChangesCount: 6,
          skippedChangesCount: 0,
          warnings: [],
          summary: "Imported external intake data."
        }
      })
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("External intake imported"),
      reason: expect.stringContaining("2 channels")
    }));
  });

  test("references launch readiness blockers", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      launchReadinessReport: launchReadiness({
        readinessStatus: "blocked",
        readinessScore: 35,
        blockers: ["Missing CTA tracking event"]
      })
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Fix validation launch blockers"),
      reason: expect.stringContaining("Missing CTA tracking event")
    }));
  });

  test("references ready launch readiness", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      launchReadinessReport: launchReadiness({
        readinessStatus: "ready",
        readinessScore: 92
      })
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Start real validation launch"),
      reason: expect.stringContaining("readinessStatus=ready")
    }));
  });
});
