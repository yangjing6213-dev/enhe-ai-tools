import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import type { EbosDeploymentOperatorChecklistReport } from "../../deployment-operator";
import { generateNextWeekPlan } from "../weekly-report-plan";

function operatorChecklist(safeToProceed: boolean): EbosDeploymentOperatorChecklistReport {
  return {
    reportType: "production_deployment_operator_checklist",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-05T00:00:00.000Z",
    currentDeploymentStatus: "approved_not_executed",
    approvedByUser: true,
    deploymentScope: ["Validation page deployment"],
    commandAudit: {
      commandsAudited: 5,
      localCommands: [],
      serverCommands: [],
      dockerCommands: [],
      nginxCommands: [],
      verificationCommands: [],
      rollbackCommands: [],
      dangerousCommandsDetected: safeToProceed ? [] : ["rm -rf /"],
      migrationCommandsDetected: [],
      secretExposureRisks: [],
      manualRequiredCommands: [{
        id: "server-1",
        title: "Manual server command",
        command: "docker compose ps",
        category: "docker",
        source: "unit-test",
        manualRequired: true,
        dangerous: false,
        migration: false,
        secretExposure: false,
        warnings: []
      }],
      safeToProceed,
      warnings: []
    },
    operatorChecklist: [],
    executionSteps: [],
    statusUpdateTemplate: {
      targetDate: "2026-07-03",
      currentStatus: "approved_not_executed",
      allowedNextStatuses: ["executing", "deployed_pending_verification", "failed", "rolled_back"],
      forbiddenStatuses: ["verified"],
      statusUpdateRules: [],
      templateAfterLocalCommands: { deploymentStatus: "approved_not_executed" },
      templateAfterServerCommands: { deploymentStatus: "deployed_pending_verification" },
      templateAfterPostLaunchCheck: { deploymentStatus: "verified", postLaunchCheckStatus: "passed" },
      warnings: []
    },
    postCommandVerificationPlan: [],
    blockers: [],
    warnings: [],
    nextActions: []
  };
}

describe("weekly plan deployment operator checklist integration", () => {
  test("recommends real deployment execution confirmation when operator checklist is safe", () => {
    const plan = generateNextWeekPlan(
      createEmptyEbosReport("weekly", new Date(2026, 6, 3)),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      operatorChecklist(true)
    );

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Confirm real deployment execution with operator checklist",
      description: expect.stringContaining("manualRequiredCommands=1")
    }));
  });

  test("prioritizes dangerous command fixes when operator checklist is not safe", () => {
    const plan = generateNextWeekPlan(
      createEmptyEbosReport("weekly", new Date(2026, 6, 3)),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      operatorChecklist(false)
    );

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Fix deployment command audit blockers"
    }));
  });
});
