import { describe, expect, test } from "vitest";
import type { EbosDeploymentOperatorChecklistReport } from "../../deployment-operator";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";

function operatorChecklist(): EbosDeploymentOperatorChecklistReport {
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
      dangerousCommandsDetected: [],
      migrationCommandsDetected: [],
      secretExposureRisks: [],
      manualRequiredCommands: [],
      safeToProceed: true,
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

describe("monthly plan deployment operator checklist integration", () => {
  test("references the operator checklist when it is safe to proceed", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      deploymentOperatorChecklist: operatorChecklist()
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: "Confirm real deployment execution with operator checklist"
    }));
  });
});
