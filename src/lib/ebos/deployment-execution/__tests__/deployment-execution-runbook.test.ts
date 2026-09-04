import { describe, expect, test } from "vitest";
import { buildDeploymentExecutionRunbook } from "../deployment-execution-runbook";
import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionContract
} from "../deployment-execution-types";

function gate(): EbosDeploymentApprovalGate {
  return {
    gateType: "production_deployment_approval_gate",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T04:00:00.000Z",
    preflightReportPath: "reports/ebos/deployment/2026-07-03-production-deployment-preflight.json",
    deploymentPlanPath: "reports/ebos/deployment/2026-07-03-production-deployment-plan.json",
    siteUrl: "https://www.enhe-tech.com.cn",
    deploymentScope: ["Validation page deployment"],
    approvalStatus: "awaiting_user_approval",
    deploymentStatus: "awaiting_approval",
    approvalChecklist: [],
    commandsRequiringApproval: [],
    codexAllowedActions: [],
    userRequiredConfirmations: ["确认部署验证页"],
    riskAcknowledgements: [],
    rollbackSummary: "Scoped rollback only",
    warnings: []
  };
}

function contract(): EbosDeploymentExecutionContract {
  return {
    contractType: "production_deployment_execution_contract",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T04:00:00.000Z",
    deploymentScope: ["Validation page deployment"],
    localPreDeployCommands: [],
    serverDeploymentCommands: [],
    dockerCommands: [],
    nginxCommands: [],
    verificationCommands: [
      {
        id: "verify",
        command: "npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn",
        environment: "verification",
        riskLevel: "low",
        requiresUserApproval: false,
        canCodexRunLocally: true,
        mustBeRunOnServer: false,
        description: "Post launch check"
      }
    ],
    rollbackCommands: ["Redeploy the previous known-good build."],
    executionStatusTemplate: {
      statusType: "production_deployment_execution_status",
      targetDate: "2026-07-03",
      updatedAt: "2026-07-03T04:00:00.000Z",
      deploymentStatus: "not_started",
      approvedByUser: false,
      localCommandsRun: [],
      serverCommandsRun: [],
      dockerCommandsRun: [],
      verificationCommandsRun: [],
      postLaunchCheckStatus: "not_run",
      notes: [],
      warnings: []
    },
    safetyRules: [],
    warnings: []
  };
}

describe("deployment execution runbook", () => {
  test("includes confirmation phrase, post-launch check, rollback notes, and no deployed claim", () => {
    const runbook = buildDeploymentExecutionRunbook({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      approvalGate: gate(),
      executionContract: contract()
    });
    const text = JSON.stringify(runbook);

    expect(text).toContain("确认部署验证页");
    expect(text).toContain("check-ebos-validation-post-launch");
    expect(text).toContain("Redeploy the previous known-good build");
    expect(text).not.toContain("already deployed");
  });
});
