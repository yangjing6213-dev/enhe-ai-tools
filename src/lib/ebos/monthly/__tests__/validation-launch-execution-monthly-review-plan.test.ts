import { describe, expect, test } from "vitest";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";
import type {
  EbosValidationLaunchExecutionReport,
  EbosValidationPostLaunchCheckReport
} from "../../validation-launch-execution";

function execution(overrides: Partial<EbosValidationLaunchExecutionReport> = {}): EbosValidationLaunchExecutionReport {
  return {
    reportType: "validation_launch_execution",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    readinessReportPath: "readiness.json",
    runbookPath: "runbook.json",
    launchStatus: "ready_to_deploy",
    deploymentChecklist: [],
    smokeTestPlan: [],
    externalPublishPack: [],
    dataIntakeWorkflow: [],
    codexExecutableSteps: [],
    userMinimumActions: [],
    warnings: [],
    blockers: [],
    nextCommands: [],
    ...overrides
  };
}

function postLaunch(overrides: Partial<EbosValidationPostLaunchCheckReport> = {}): EbosValidationPostLaunchCheckReport {
  return {
    reportType: "validation_post_launch_check",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-04T00:00:00.000Z",
    siteUrl: "https://www.enhe-tech.com.cn",
    dryRun: false,
    checks: [],
    status: "failed",
    warnings: [],
    blockers: ["GET /en/validation/ai-prompt-kit returned 500"],
    nextActions: [],
    ...overrides
  };
}

describe("monthly plan validation launch execution integration", () => {
  test("references ready_to_deploy launch execution", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      launchExecutionReport: execution()
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Execute validation deployment"),
      reason: expect.stringContaining("launchStatus=ready_to_deploy")
    }));
  });

  test("prioritizes post-launch failures", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      launchExecutionReport: execution({ launchStatus: "deployed_pending_verification" }),
      postLaunchCheckReport: postLaunch()
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Fix failed validation post-launch routes"),
      reason: expect.stringContaining("/en/validation/ai-prompt-kit")
    }));
  });
});
