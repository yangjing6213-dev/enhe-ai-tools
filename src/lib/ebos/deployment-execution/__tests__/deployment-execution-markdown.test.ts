import { describe, expect, test } from "vitest";
import { renderDeploymentApprovalGateMarkdown } from "../deployment-execution-markdown";
import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionContract
} from "../deployment-execution-types";

describe("deployment execution markdown", () => {
  test("renders approval gate headings and does not claim deployment", () => {
    const gate: EbosDeploymentApprovalGate = {
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
      codexAllowedActions: ["Run local reports"],
      userRequiredConfirmations: ["确认部署验证页"],
      riskAcknowledgements: ["Do not print secret values."],
      rollbackSummary: "Scoped rollback only",
      warnings: []
    };
    const contract: EbosDeploymentExecutionContract = {
      contractType: "production_deployment_execution_contract",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T04:00:00.000Z",
      deploymentScope: ["Validation page deployment"],
      localPreDeployCommands: [],
      serverDeploymentCommands: [],
      dockerCommands: [],
      nginxCommands: [],
      verificationCommands: [],
      rollbackCommands: [],
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

    const markdown = renderDeploymentApprovalGateMarkdown(gate, contract);

    expect(markdown).toContain("# ENHE Production Deployment Approval Gate");
    expect(markdown).toContain("## 3. 用户确认门");
    expect(markdown).toContain("## 11. 下一步操作");
    expect(markdown).toContain("确认部署验证页");
    expect(markdown.toLowerCase()).not.toContain("secret value:");
    expect(markdown).not.toContain("已经部署");
  });
});
