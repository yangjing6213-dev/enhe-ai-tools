import { describe, expect, test } from "vitest";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";

function executionStatus(deploymentStatus: EbosDeploymentExecutionStatus["deploymentStatus"]): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-05T00:00:00.000Z",
    deploymentStatus,
    approvedByUser: true,
    approvedAt: "2026-07-04T15:33:18.303Z",
    localCommandsRun: deploymentStatus === "executing" ? ["npm run lint", "npm run typecheck", "npm run build"] : [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "not_run",
    notes: [],
    warnings: []
  };
}

describe("monthly plan real deployment execution integration", () => {
  test("shows deployment executing and waits for manual server result", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false,
      deploymentExecutionStatus: executionStatus("executing")
    });

    expect(plan.codexTasks[0]).toEqual(expect.objectContaining({
      title: "Wait for manual server deployment result",
      reason: expect.stringContaining("deploymentStatus=executing")
    }));
  });
});
