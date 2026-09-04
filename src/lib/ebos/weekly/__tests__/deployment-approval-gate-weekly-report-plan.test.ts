import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";
import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionStatus
} from "../../deployment-execution";

function gate(deploymentStatus: EbosDeploymentApprovalGate["deploymentStatus"]): EbosDeploymentApprovalGate {
  return {
    gateType: "production_deployment_approval_gate",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T04:00:00.000Z",
    preflightReportPath: "reports/ebos/deployment/2026-07-03-production-deployment-preflight.json",
    deploymentPlanPath: "reports/ebos/deployment/2026-07-03-production-deployment-plan.json",
    siteUrl: "https://www.enhe-tech.com.cn",
    deploymentScope: ["Validation page deployment"],
    approvalStatus: deploymentStatus === "approved_not_executed" ? "approved" : "awaiting_user_approval",
    deploymentStatus,
    approvalChecklist: [],
    commandsRequiringApproval: [],
    codexAllowedActions: [],
    userRequiredConfirmations: ["确认部署验证页"],
    riskAcknowledgements: [],
    rollbackSummary: "Scoped rollback only",
    warnings: []
  };
}

function executionStatus(
  deploymentStatus: EbosDeploymentExecutionStatus["deploymentStatus"],
  approvedByUser = deploymentStatus !== "awaiting_approval",
  postLaunchCheckStatus: EbosDeploymentExecutionStatus["postLaunchCheckStatus"] = "not_run"
): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-04T15:33:18.303Z",
    deploymentStatus,
    approvedByUser,
    approvedAt: approvedByUser ? "2026-07-04T15:33:18.303Z" : undefined,
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus,
    notes: [],
    warnings: []
  };
}

describe("weekly plan deployment approval gate integration", () => {
  test("asks for user approval while approval gate is awaiting approval", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, undefined, undefined, undefined, gate("awaiting_approval"));

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("等待用户确认部署验证页")
    }));
  });

  test("moves to external channel data intake after deployment is verified", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, undefined, undefined, undefined, gate("verified"));

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("开始真实外部渠道发布和数据回填")
    }));
  });

  test("asks to run EBOS live check while deployment is pending verification", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(
      report,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gate("awaiting_approval"),
      executionStatus("deployed_pending_verification")
    );

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Run EBOS post-launch live check",
      description: expect.stringContaining("verify-ebos-production-deployment")
    }));
  });

  test("prioritizes failed post-launch route fixes while pending verification", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(
      report,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gate("awaiting_approval"),
      executionStatus("deployed_pending_verification", true, "failed")
    );

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Fix failed EBOS post-launch live check routes"
    }));
  });

  test("verified execution status recommends external channel data backfill", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(
      report,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gate("awaiting_approval"),
      executionStatus("verified", true, "passed")
    );

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      description: expect.stringContaining("external channel publishing and validation data intake")
    }));
  });

  test("shows deployment execution stage when approval is recorded but deployment is not executed", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(report, undefined, undefined, undefined, undefined, undefined, undefined, gate("approved_not_executed"));

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Execute approved validation deployment",
      description: expect.stringContaining("尚未执行真实部署")
    }));
  });

  test("prefers approved execution status over an older awaiting approval gate", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 3, 10, 0));
    const plan = generateNextWeekPlan(
      report,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      gate("awaiting_approval"),
      executionStatus("approved_not_executed")
    );
    const titles = plan.actionItems.map((item) => item.title).join("\n");

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Execute approved validation deployment",
      description: expect.stringContaining("approved_not_executed")
    }));
    expect(titles).not.toContain("等待用户确认部署验证页");
  });
});
