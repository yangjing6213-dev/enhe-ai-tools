import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  readDeploymentExecutionStatus,
  summarizeDeploymentExecutionStatus,
  writeDeploymentExecutionStatusTemplate
} from "../deployment-status-reader";
import type { EbosDeploymentExecutionStatus } from "../deployment-execution-types";

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("deployment execution status reader", () => {
  test("writes and reads awaiting approval status template", async () => {
    const reportsRoot = await mkdtemp(join(tmpdir(), "ebos-status-"));
    tempDirs.push(reportsRoot);

    const written = await writeDeploymentExecutionStatusTemplate({
      targetDate: "2026-07-03",
      reportsRoot
    });
    const read = await readDeploymentExecutionStatus({
      targetDate: "2026-07-03",
      reportsRoot
    });

    expect(written.status).toEqual(expect.objectContaining({
      approvedByUser: false,
      deploymentStatus: "awaiting_approval"
    }));
    expect(read?.status).toEqual(written.status);
  });

  test("warns when deployed status has no post-launch verification", () => {
    const status: EbosDeploymentExecutionStatus = {
      statusType: "production_deployment_execution_status",
      targetDate: "2026-07-03",
      updatedAt: "2026-07-03T04:00:00.000Z",
      deploymentStatus: "deployed_pending_verification",
      approvedByUser: true,
      approvedAt: "2026-07-03T04:00:00.000Z",
      localCommandsRun: ["npm run build"],
      serverCommandsRun: ["docker compose up"],
      dockerCommandsRun: [],
      verificationCommandsRun: [],
      postLaunchCheckStatus: "not_run",
      notes: [],
      warnings: []
    };

    const summary = summarizeDeploymentExecutionStatus(status);

    expect(summary.warnings.join("\n")).toContain("post-launch");
    expect(summary.deploymentStatus).toBe("deployed_pending_verification");
  });
});
