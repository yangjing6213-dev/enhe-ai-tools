import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import type { EbosDeploymentExecutionStatus } from "../deployment-execution-types";
import {
  updateStatusAfterLocalCommands,
  updateStatusAfterManualServerResult,
  updateStatusToExecuting
} from "../deployment-execution-status-updater";
import type { EbosDeploymentCommandResult } from "../deployment-real-execution-types";

const confirmationPhrase = "确认执行真实部署命令";

function status(deploymentStatus: EbosDeploymentExecutionStatus["deploymentStatus"]): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-04T15:33:18.303Z",
    deploymentStatus,
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

async function writeStatus(value: EbosDeploymentExecutionStatus) {
  const dir = await mkdtemp(join(tmpdir(), "ebos-status-"));
  const statusPath = join(dir, "2026-07-03-deployment-execution-status.json");
  await writeFile(statusPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return statusPath;
}

async function readStatus(statusPath: string) {
  return JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;
}

function localResult(command: string, resultStatus: EbosDeploymentCommandResult["status"]): EbosDeploymentCommandResult {
  return {
    id: command.replace(/\s+/g, "-"),
    command,
    environment: "local",
    status: resultStatus,
    exitCode: resultStatus === "success" ? 0 : 1,
    summary: `${command} ${resultStatus}`,
    warnings: []
  };
}

describe("deployment execution status updater", () => {
  test("updates approved_not_executed to executing after exact confirmation and creates backup", async () => {
    const statusPath = await writeStatus(status("approved_not_executed"));

    const result = await updateStatusToExecuting({
      statusPath,
      confirmationPhrase,
      now: "2026-07-05T00:00:00.000Z"
    });
    const next = await readStatus(statusPath);

    expect(result).toEqual(expect.objectContaining({
      previousStatus: "approved_not_executed",
      nextStatus: "executing",
      updated: true
    }));
    expect(result.backupPath).toBeTruthy();
    expect(next.deploymentStatus).toBe("executing");
  });

  test("rejects confirmation mismatch", async () => {
    const statusPath = await writeStatus(status("approved_not_executed"));

    const result = await updateStatusToExecuting({
      statusPath,
      confirmationPhrase: "确认部署验证页"
    });

    expect(result.updated).toBe(false);
    expect(result.nextStatus).toBe("approved_not_executed");
    expect(result.warnings.join("\n")).toContain("confirmation phrase");
  });

  test("rejects status that is not approved_not_executed", async () => {
    const statusPath = await writeStatus(status("executing"));

    const result = await updateStatusToExecuting({ statusPath, confirmationPhrase });

    expect(result.updated).toBe(false);
    expect(result.warnings.join("\n")).toContain("approved_not_executed");
  });

  test("keeps executing after successful local commands without server result", async () => {
    const statusPath = await writeStatus(status("executing"));

    const result = await updateStatusAfterLocalCommands({
      statusPath,
      localCommandResults: [
        localResult("npm run lint", "success"),
        localResult("npm run typecheck", "success"),
        localResult("npm run build", "success")
      ],
      now: "2026-07-05T00:10:00.000Z"
    });
    const next = await readStatus(statusPath);

    expect(result.nextStatus).toBe("executing");
    expect(next.deploymentStatus).toBe("executing");
    expect(next.localCommandsRun).toEqual(["npm run lint", "npm run typecheck", "npm run build"]);
  });

  test("moves executing to failed when a local command fails", async () => {
    const statusPath = await writeStatus(status("executing"));

    const result = await updateStatusAfterLocalCommands({
      statusPath,
      localCommandResults: [
        localResult("npm run lint", "success"),
        localResult("npm run build", "failed")
      ],
      now: "2026-07-05T00:10:00.000Z"
    });
    const next = await readStatus(statusPath);

    expect(result.nextStatus).toBe("failed");
    expect(next.deploymentStatus).toBe("failed");
  });

  test("moves to deployed_pending_verification only after complete manual server result", async () => {
    const statusPath = await writeStatus(status("executing"));

    const result = await updateStatusAfterManualServerResult({
      statusPath,
      manualResult: {
        serverCommandsCompleted: true,
        dockerCommandsCompleted: true,
        nginxCommandsCompleted: true,
        deployedAt: "2026-07-05T00:20:00.000Z",
        notes: "Completed on server.",
        evidence: ["non-secret server output summary"]
      }
    });
    const next = await readStatus(statusPath);

    expect(result.nextStatus).toBe("deployed_pending_verification");
    expect(next.deploymentStatus).toBe("deployed_pending_verification");
    expect(next.deployedAt).toBe("2026-07-05T00:20:00.000Z");
  });

  test("does not transition incomplete manual server result or write verified", async () => {
    const statusPath = await writeStatus(status("executing"));

    const result = await updateStatusAfterManualServerResult({
      statusPath,
      manualResult: {
        serverCommandsCompleted: true,
        dockerCommandsCompleted: false,
        nginxCommandsCompleted: true,
        deployedAt: null,
        notes: "",
        evidence: []
      }
    });
    const next = await readStatus(statusPath);

    expect(result.updated).toBe(false);
    expect(result.nextStatus).toBe("executing");
    expect(next.deploymentStatus).toBe("executing");
    expect(result.forbiddenStatuses).toContain("verified");
  });
});
