import { describe, expect, test } from "vitest";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";
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

describe("monthly plan deployment approval gate integration", () => {
  test("references awaiting deployment approval gate", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("awaiting_approval")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("等待用户确认部署验证页")
    }));
  });

  test("references verified deployment gate as real external data intake trigger", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("verified")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: expect.stringContaining("开始真实外部渠道发布和数据回填")
    }));
  });

  test("references pending verification as EBOS post-launch live check task", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("awaiting_approval"),
      deploymentExecutionStatus: executionStatus("deployed_pending_verification")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: "Run EBOS post-launch live check",
      reason: expect.stringContaining("verify-ebos-production-deployment")
    }));
  });

  test("prioritizes failed EBOS post-launch route fixes", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("awaiting_approval"),
      deploymentExecutionStatus: executionStatus("deployed_pending_verification", true, "failed")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: "Fix failed EBOS post-launch live check routes"
    }));
  });

  test("verified execution status recommends external channel data backfill", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("awaiting_approval"),
      deploymentExecutionStatus: executionStatus("verified", true, "passed")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      reason: expect.stringContaining("real external channel publishing and validation data intake")
    }));
  });

  test("references approved_not_executed as execution stage but not deployed", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("approved_not_executed")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: "Execute approved deployment and run post-launch verification",
      reason: expect.stringContaining("尚未执行真实部署")
    }));
  });

  test("prefers approved execution status over an older awaiting approval gate", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      productionDeploymentApprovalGate: gate("awaiting_approval"),
      deploymentExecutionStatus: executionStatus("approved_not_executed")
    });
    const taskTitles = plan.codexTasks.map((item) => item.title).join("\n");
    const okrTitles = plan.nextMonthOKRs.map((item) => item.objective).join("\n");

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: "Execute approved deployment and run post-launch verification",
      reason: expect.stringContaining("approved_not_executed")
    }));
    expect(plan.nextMonthOKRs[0]?.objective).toBe("Execute approved deployment and run post-launch verification");
    expect(`${taskTitles}\n${okrTitles}`).not.toContain("等待用户确认部署验证页");
  });
});
