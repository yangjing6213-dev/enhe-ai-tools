import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";
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
    status: "passed",
    warnings: [],
    blockers: [],
    nextActions: [],
    ...overrides
  };
}

describe("weekly plan validation launch execution integration", () => {
  test("suggests deployment when launch execution is ready_to_deploy", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, execution());

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Execute validation deployment"),
      description: expect.stringContaining("launchStatus=ready_to_deploy")
    }));
  });

  test("prioritizes failed post-launch route checks", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, execution({
      launchStatus: "deployed_pending_verification"
    }), postLaunch({
      status: "failed",
      blockers: ["GET /validation/ai-prompt-kit returned 404"]
    }));

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("Fix failed validation post-launch routes"),
      description: expect.stringContaining("/validation/ai-prompt-kit")
    }));
  });

  test("collects real data after post-launch checks pass", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, execution({
      launchStatus: "deployed_pending_verification"
    }), postLaunch({
      status: "passed"
    }));

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Collect real validation data"),
      description: expect.stringContaining("post-launch check passed")
    }));
  });
});
