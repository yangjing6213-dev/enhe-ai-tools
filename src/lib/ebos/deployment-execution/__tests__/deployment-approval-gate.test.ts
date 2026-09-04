import { describe, expect, test } from "vitest";
import { buildDeploymentApprovalGate } from "../deployment-approval-gate";
import type {
  EbosProductionDeploymentPlanReport,
  EbosProductionDeploymentPreflightReport
} from "../../deployment";

function preflight(): EbosProductionDeploymentPreflightReport {
  return {
    reportType: "production_deployment_preflight",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T04:00:00.000Z",
    siteUrl: "https://www.enhe-tech.com.cn",
    validationRoutes: ["/validation/ai-prompt-kit", "/en/validation/ai-prompt-kit"],
    configSummary: {
      packageManagerDetected: "npm",
      scriptsDetected: { lint: true, typecheck: true, build: true, start: true, test: true, "prisma:generate": true },
      nextConfigDetected: true,
      dockerfileDetected: true,
      dockerComposeDetected: true,
      nginxConfigDetected: true,
      deployDocsDetected: true,
      standaloneOutputDetected: true,
      warnings: []
    },
    buildChecks: [],
    routeChecks: [],
    environmentChecks: [],
    dockerChecks: [],
    nginxChecks: [],
    deploymentPlan: { localCommands: [], serverCommands: [], dockerCommands: [], verificationCommands: [], notes: [], warnings: [] },
    rollbackPlan: {
      rollbackStrategy: "Scoped rollback only",
      filesToRevert: ["src/app/(zh-public)/validation/ai-prompt-kit/page.tsx"],
      commands: ["Redeploy the previous known-good build."],
      dataSafetyNotes: ["Do not delete reports/ebos."],
      warnings: []
    },
    postDeploySmokeTests: [],
    readinessScore: 98,
    readinessStatus: "ready_to_deploy",
    blockers: [],
    warnings: [],
    nextActions: []
  };
}

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
      filesToRevert: ["src/app/(zh-public)/validation/ai-prompt-kit/page.tsx"],
      commands: ["Redeploy the previous known-good build."],
      dataSafetyNotes: ["Do not delete reports/ebos."],
      warnings: []
    },
    userConfirmations: [],
    warnings: []
  };
}

describe("deployment approval gate", () => {
  test("defaults to awaiting user approval and awaiting deployment approval", async () => {
    const gate = await buildDeploymentApprovalGate({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      preflightReport: preflight(),
      deploymentPlanReport: deploymentPlan()
    });

    expect(gate.approvalStatus).toBe("awaiting_user_approval");
    expect(gate.deploymentStatus).toBe("awaiting_approval");
  });

  test("requires approval for server docker and nginx commands", async () => {
    const gate = await buildDeploymentApprovalGate({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      preflightReport: preflight(),
      deploymentPlanReport: deploymentPlan()
    });

    expect(gate.commandsRequiringApproval).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ environment: "server", requiresUserApproval: true, mustBeRunOnServer: true }),
        expect.objectContaining({ environment: "docker", requiresUserApproval: true, mustBeRunOnServer: true }),
        expect.objectContaining({ environment: "nginx", requiresUserApproval: true, mustBeRunOnServer: true })
      ])
    );
  });

  test("keeps codex allowed actions local and includes safety checklist items", async () => {
    const gate = await buildDeploymentApprovalGate({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      preflightReport: preflight(),
      deploymentPlanReport: deploymentPlan()
    });
    const checklistText = gate.approvalChecklist.map((item) => `${item.title} ${item.description}`).join("\n").toLowerCase();
    const codexActionsText = gate.codexAllowedActions.join("\n").toLowerCase();

    expect(codexActionsText).not.toContain("ssh");
    expect(codexActionsText).not.toContain("server deployment");
    expect(checklistText).toContain("no prisma migration");
    expect(checklistText).toContain("no /admin/ebos ui");
    expect(checklistText).toContain("secret");
    expect(gate.userRequiredConfirmations.join("\n")).toContain("确认部署验证页");
  });
});
