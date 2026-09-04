import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import { generateNextWeekPlan } from "../weekly-report-plan";

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
    warnings: deploymentStatus === "failed" ? ["npm run build failed"] : []
  };
}

describe("weekly plan real deployment execution integration", () => {
  test("shows deployment executing and waits for manual server result", () => {
    const plan = generateNextWeekPlan(
      createEmptyEbosReport("weekly", new Date(2026, 6, 3)),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      executionStatus("executing")
    );

    expect(plan.actionItems[0]).toEqual(expect.objectContaining({
      title: "Wait for manual server deployment result",
      description: expect.stringContaining("deploymentStatus=executing")
    }));
  });
});
