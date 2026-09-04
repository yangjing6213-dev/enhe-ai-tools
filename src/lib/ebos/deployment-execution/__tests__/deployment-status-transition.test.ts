import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { buildApprovalResponseAudit } from "../deployment-approval-response-parser";
import {
  buildApprovedNotExecutedStatus,
  transitionDeploymentStatus,
  writeDeploymentStatusSafely
} from "../deployment-status-transition";
import type { EbosDeploymentExecutionStatus } from "../deployment-execution-types";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

function status(overrides: Partial<EbosDeploymentExecutionStatus> = {}): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-03T04:00:00.000Z",
    deploymentStatus: "awaiting_approval",
    approvedByUser: false,
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "not_run",
    notes: [],
    warnings: [],
    ...overrides
  };
}

describe("deployment status transition", () => {
  test("builds approved_not_executed status without marking deployed", () => {
    const next = buildApprovedNotExecutedStatus({
      currentStatus: status(),
      approvedAt: "2026-07-03T05:00:00.000Z",
      source: "unit-test"
    });

    expect(next).toEqual(expect.objectContaining({
      approvedByUser: true,
      deploymentStatus: "approved_not_executed",
      approvedAt: "2026-07-03T05:00:00.000Z"
    }));
    expect(next.deploymentStatus).not.toBe("verified");
  });

  test("dryRun does not write status or create backup", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ebos-transition-"));
    tempDirs.push(dir);
    const statusPath = join(dir, "status.json");
    await writeFile(statusPath, `${JSON.stringify(status(), null, 2)}\n`, "utf8");

    const result = await writeDeploymentStatusSafely({
      statusPath,
      approvalAudit: buildApprovalResponseAudit("确认部署验证页", "确认部署验证页"),
      dryRun: true,
      backupDir: join(dir, "backups")
    });
    const after = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;

    expect(result.written).toBe(false);
    expect(result.backupPath).toBeUndefined();
    expect(after.approvedByUser).toBe(false);
    expect(after.deploymentStatus).toBe("awaiting_approval");
  });

  test("apply writes approved status and creates backup", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ebos-transition-"));
    tempDirs.push(dir);
    const statusPath = join(dir, "status.json");
    const backupDir = join(dir, "backups");
    await writeFile(statusPath, `${JSON.stringify(status(), null, 2)}\n`, "utf8");

    const result = await writeDeploymentStatusSafely({
      statusPath,
      approvalAudit: buildApprovalResponseAudit("确认部署验证页", "确认部署验证页"),
      dryRun: false,
      backupDir,
      now: "2026-07-03T05:00:00.000Z",
      source: "unit-test"
    });
    const after = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;

    expect(result.written).toBe(true);
    expect(result.backupPath).toContain("before-approval");
    expect(after.approvedByUser).toBe(true);
    expect(after.deploymentStatus).toBe("approved_not_executed");
  });

  test("rejects non awaiting approval status", () => {
    const result = transitionDeploymentStatus({
      currentStatus: status({ deploymentStatus: "approved_not_executed", approvedByUser: true }),
      approvalAudit: buildApprovalResponseAudit("确认部署验证页", "确认部署验证页"),
      apply: true
    });

    expect(result.allowed).toBe(false);
    expect(result.warnings.join("\n")).toContain("awaiting_approval");
  });

  test("does not allow direct transition to verified or deployed pending verification", () => {
    const result = transitionDeploymentStatus({
      currentStatus: status(),
      approvalAudit: buildApprovalResponseAudit("确认部署验证页", "确认部署验证页"),
      apply: true,
      requestedDeploymentStatus: "verified"
    });

    expect(result.allowed).toBe(false);
    expect(result.nextStatus?.deploymentStatus).not.toBe("verified");
  });
});
