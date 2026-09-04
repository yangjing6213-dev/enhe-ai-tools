import { describe, expect, test } from "vitest";
import type { EbosDeploymentOperatorChecklistReport } from "../../deployment-operator";
import {
  buildExecutionOrder,
  buildServerDeploymentCommandPack,
  groupManualRequiredCommands
} from "../deployment-server-command-pack";

function operatorChecklist(): EbosDeploymentOperatorChecklistReport {
  return {
    reportType: "production_deployment_operator_checklist",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-05T00:00:00.000Z",
    currentDeploymentStatus: "approved_not_executed",
    approvedByUser: true,
    deploymentScope: ["Validation page deployment"],
    commandAudit: {
      commandsAudited: 4,
      localCommands: [],
      serverCommands: [],
      dockerCommands: [],
      nginxCommands: [],
      verificationCommands: [],
      rollbackCommands: [],
      dangerousCommandsDetected: [],
      migrationCommandsDetected: [],
      secretExposureRisks: [],
      manualRequiredCommands: [],
      safeToProceed: true,
      warnings: []
    },
    operatorChecklist: [
      {
        id: "server-1",
        title: "Server command",
        phase: "server_deploy",
        actor: "user_server",
        status: "manual_required",
        command: "Server project path must be confirmed before SSH or deployment commands are run.",
        riskLevel: "high",
        approvalRequired: true,
        evidence: "Manual server context required.",
        rollbackNote: "Stop and review scoped rollback."
      },
      {
        id: "docker-1",
        title: "Build compose",
        phase: "docker_restart",
        actor: "user_server",
        status: "manual_required",
        command: "docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build",
        riskLevel: "high",
        approvalRequired: true,
        evidence: "Manual server context required.",
        rollbackNote: "Use previous known-good build if needed."
      },
      {
        id: "nginx-1",
        title: "Reload nginx",
        phase: "nginx_reload",
        actor: "user_server",
        status: "manual_required",
        command: "nginx -t && nginx -s reload",
        riskLevel: "high",
        approvalRequired: true,
        evidence: "Manual server context required.",
        rollbackNote: "Do not reload if config test fails."
      }
    ],
    executionSteps: [],
    statusUpdateTemplate: {
      targetDate: "2026-07-03",
      currentStatus: "approved_not_executed",
      allowedNextStatuses: ["executing", "deployed_pending_verification", "failed", "rolled_back"],
      forbiddenStatuses: ["verified"],
      statusUpdateRules: [],
      templateAfterLocalCommands: {},
      templateAfterServerCommands: {},
      templateAfterPostLaunchCheck: {},
      warnings: []
    },
    postCommandVerificationPlan: [],
    blockers: [],
    warnings: [],
    nextActions: []
  };
}

describe("server deployment command pack", () => {
  test("extracts manual required commands from operator checklist", () => {
    const groups = groupManualRequiredCommands(operatorChecklist());

    expect(groups.flatMap((group) => group.commands)).toHaveLength(3);
    expect(groups.map((group) => group.environment)).toEqual(["server", "docker", "nginx"]);
  });

  test("builds execution order for server, docker, nginx, and status recording", () => {
    const order = buildExecutionOrder(groupManualRequiredCommands(operatorChecklist()));

    expect(order).toEqual([
      "server_deploy",
      "docker_commands",
      "nginx_commands",
      "status_recording"
    ]);
  });

  test("builds a command pack without claiming deployment", () => {
    const pack = buildServerDeploymentCommandPack({
      targetDate: "2026-07-03",
      currentDeploymentStatus: "executing",
      operatorChecklist: operatorChecklist(),
      resultInputTemplatePath: "reports/ebos/deployment/execution/command-results/2026-07-03-server-deployment-result.json"
    });

    expect(pack.packType).toBe("server_deployment_command_pack");
    expect(pack.currentDeploymentStatus).toBe("executing");
    expect(pack.manualRequiredCommands).toHaveLength(3);
    expect(pack.commandGroups).toHaveLength(3);
    expect(pack.commandGroups.every((group) => group.expectedOutcome && group.failureHandling && group.evidenceToCollect.length > 0)).toBe(true);
    expect(JSON.stringify(pack)).not.toContain("deploymentStatus: verified");
  });
});
