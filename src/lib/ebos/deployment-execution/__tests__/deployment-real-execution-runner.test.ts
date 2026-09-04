import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import type { EbosDeploymentExecutionStatus } from "../deployment-execution-types";
import {
  buildManualServerCommandPackage,
  runLocalPreDeploymentCommands,
  startProductionDeploymentExecution
} from "../deployment-real-execution-runner";
import type { EbosDeploymentOperatorChecklistReport } from "../../deployment-operator";

const confirmationPhrase = "确认执行真实部署命令";

function status(): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-04T15:33:18.303Z",
    deploymentStatus: "approved_not_executed",
    approvedByUser: true,
    approvedAt: "2026-07-04T15:33:18.303Z",
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "not_run",
    notes: [],
    warnings: []
  };
}

function operatorChecklist(): EbosDeploymentOperatorChecklistReport {
  return {
    reportType: "production_deployment_operator_checklist",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-05T00:00:00.000Z",
    currentDeploymentStatus: "approved_not_executed",
    approvedByUser: true,
    deploymentScope: ["Validation page deployment"],
    commandAudit: {
      commandsAudited: 2,
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
        command: "manual server command",
        riskLevel: "high",
        approvalRequired: true,
        evidence: "Manual only"
      },
      {
        id: "docker-1",
        title: "Docker command",
        phase: "docker_restart",
        actor: "user_server",
        status: "manual_required",
        command: "docker compose ps",
        riskLevel: "high",
        approvalRequired: true,
        evidence: "Manual only"
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

async function writeStatus() {
  const root = await mkdtemp(join(tmpdir(), "ebos-real-execution-"));
  const statusPath = join(root, "deployment", "execution", "status", "2026-07-03-deployment-execution-status.json");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(join(root, "deployment", "execution", "status"), { recursive: true }));
  await writeFile(statusPath, `${JSON.stringify(status(), null, 2)}\n`, "utf8");
  return { root, statusPath };
}

describe("deployment real execution runner", () => {
  test("runs only local pre-deployment commands through injected executor", async () => {
    const commandsRun: string[] = [];
    const results = await runLocalPreDeploymentCommands({
      targetDate: "2026-07-03",
      commandExecutor: async (command) => {
        commandsRun.push(command);
        return { exitCode: 0, summary: `${command} passed` };
      }
    });

    expect(commandsRun).toEqual(["npm run lint", "npm run typecheck", "npm run build"]);
    expect(results.every((result) => result.environment === "local")).toBe(true);
    expect(results.every((result) => result.status === "success")).toBe(true);
  });

  test("builds manual server command package without executing server commands", () => {
    const results = buildManualServerCommandPackage({ operatorChecklist: operatorChecklist() });

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === "manual_required")).toBe(true);
    expect(results.map((result) => result.environment)).toEqual(["server", "docker"]);
  });

  test("starts execution, records local results, and leaves server commands manual", async () => {
    const { root, statusPath } = await writeStatus();
    const outputRoot = join(root, "deployment", "execution");

    const report = await startProductionDeploymentExecution({
      targetDate: "2026-07-03",
      statusPath,
      outputRoot,
      confirmationPhrase,
      operatorChecklist: operatorChecklist(),
      commandExecutor: async (command) => ({ exitCode: 0, summary: `${command} passed` }),
      now: "2026-07-05T00:00:00.000Z"
    });
    const next = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;

    expect(report.executionStatus.deploymentStatus).toBe("executing");
    expect(next.deploymentStatus).toBe("executing");
    expect(report.localCommandResults).toHaveLength(3);
    expect(report.serverCommandResults.every((result) => result.status === "manual_required")).toBe(true);
    expect(report.nextActions.join("\n")).toContain("server");
  });
});
