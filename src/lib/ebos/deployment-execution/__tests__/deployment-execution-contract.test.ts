import { describe, expect, test } from "vitest";
import { buildDeploymentExecutionContract } from "../deployment-execution-contract";
import type { EbosProductionDeploymentPlanReport } from "../../deployment";

function deploymentPlan(): EbosProductionDeploymentPlanReport {
  return {
    reportType: "production_deployment_plan",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T04:00:00.000Z",
    siteUrl: "https://www.enhe-tech.com.cn",
    preflightStatus: "ready_to_deploy",
    deploymentPlan: {
      localCommands: [
        { id: "lint", title: "Run lint", status: "ready", command: "npm run lint", notes: "local" }
      ],
      serverCommands: [
        { id: "server-path", title: "Manual confirmation required", status: "manual_required", notes: "server path must be confirmed" }
      ],
      dockerCommands: [
        { id: "docker-up", title: "Docker compose up", status: "ready", command: "docker compose up -d --build", notes: "server" }
      ],
      verificationCommands: [
        { id: "verify", title: "Post-launch check", status: "ready", command: "npx tsx scripts/check-ebos-validation-post-launch.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn", notes: "post deploy" }
      ],
      notes: [],
      warnings: []
    },
    rollbackPlan: {
      rollbackStrategy: "Scoped rollback only",
      filesToRevert: [],
      commands: ["Redeploy the previous known-good build."],
      dataSafetyNotes: [],
      warnings: []
    },
    userConfirmations: [],
    warnings: []
  };
}

describe("deployment execution contract", () => {
  test("marks local commands as Codex-runnable and server commands as approval-required", () => {
    const contract = buildDeploymentExecutionContract({
      targetDate: "2026-07-03",
      deploymentPlanReport: deploymentPlan()
    });

    expect(contract.localPreDeployCommands[0]).toEqual(expect.objectContaining({
      canCodexRunLocally: true,
      requiresUserApproval: false
    }));
    expect(contract.serverDeploymentCommands[0]).toEqual(expect.objectContaining({
      requiresUserApproval: true,
      mustBeRunOnServer: true
    }));
    expect(contract.dockerCommands[0]).toEqual(expect.objectContaining({
      requiresUserApproval: true,
      mustBeRunOnServer: true
    }));
  });

  test("forbids prisma migrate deploy and starts with unapproved status template", () => {
    const contract = buildDeploymentExecutionContract({
      targetDate: "2026-07-03",
      deploymentPlanReport: deploymentPlan()
    });
    const safetyRules = contract.safetyRules.join("\n").toLowerCase();

    expect(safetyRules).toContain("do not print secret");
    expect(safetyRules).toContain("do not run prisma migrate deploy");
    expect(contract.executionStatusTemplate).toEqual(expect.objectContaining({
      approvedByUser: false,
      deploymentStatus: "not_started"
    }));
  });
});
