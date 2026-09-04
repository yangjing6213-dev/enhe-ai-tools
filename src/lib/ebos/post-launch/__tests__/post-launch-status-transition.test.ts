import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { EbosDeploymentExecutionStatus } from "../../deployment-execution";
import { runPostLaunchLiveCheck } from "../post-launch-live-checker";
import {
  canVerifyDeployment,
  transitionDeploymentStatusToVerified
} from "../post-launch-status-transition";
import type { EbosPostLaunchFetch } from "../post-launch-types";

function status(deploymentStatus: EbosDeploymentExecutionStatus["deploymentStatus"]): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: "2026-07-03",
    updatedAt: "2026-07-05T09:16:59.612Z",
    deploymentStatus,
    approvedByUser: true,
    approvedAt: "2026-07-04T15:33:18.303Z",
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "not_run",
    deployedAt: "2026-07-05T17:14:48+08:00",
    notes: [],
    warnings: []
  };
}

function completeHtml() {
  return `<!doctype html><html><head><title>AI Prompt Kit</title><meta name="description" content="Validation page."></head><body><h1>AI Prompt Kit</h1><a>Contact</a><section>FAQ</section><section>Compliance Disclaimer</section>${"x".repeat(600)}</body></html>`;
}

const fetcher: EbosPostLaunchFetch = async (url) => ({
  ok: true,
  status: 200,
  url,
  text: async () => completeHtml()
});

async function writeStatusFile(value: EbosDeploymentExecutionStatus) {
  const dir = await mkdtemp(join(tmpdir(), "ebos-post-launch-"));
  const statusPath = join(dir, "2026-07-03-deployment-execution-status.json");
  await writeFile(statusPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return { dir, statusPath };
}

describe("post-launch status transition", () => {
  test("current status that is not deployed_pending_verification cannot verify", async () => {
    const report = await runPostLaunchLiveCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "executing",
      fetcher
    });

    const result = canVerifyDeployment({
      currentStatus: status("executing"),
      report
    });

    expect(result.allowed).toBe(false);
    expect(result.blockers.join("\n")).toContain("deployed_pending_verification");
  });

  test("deployed_pending_verification plus passed live check writes verified and backup", async () => {
    const { statusPath } = await writeStatusFile(status("deployed_pending_verification"));
    const report = await runPostLaunchLiveCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "deployed_pending_verification",
      fetcher
    });

    const transition = await transitionDeploymentStatusToVerified({
      statusPath,
      report,
      now: "2026-07-05T10:00:00.000Z",
      verificationCommand: "npx tsx scripts/run-ebos-post-launch-live-check.ts --date 2026-07-03 --site-url https://www.enhe-tech.com.cn"
    });
    const next = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;

    expect(transition.updated).toBe(true);
    expect(transition.backupPath).toContain("before-verification");
    expect(next.deploymentStatus).toBe("verified");
    expect(next.postLaunchCheckStatus).toBe("passed");
    expect(next.verifiedAt).toBe("2026-07-05T10:00:00.000Z");
    expect(next.verificationCommandsRun[0]).toContain("run-ebos-post-launch-live-check");
    expect(next.deployedAt).toBe("2026-07-05T17:14:48+08:00");
  });

  test("failed live check does not write verified", async () => {
    const { statusPath } = await writeStatusFile(status("deployed_pending_verification"));
    const report = await runPostLaunchLiveCheck({
      targetDate: "2026-07-03",
      siteUrl: "https://www.enhe-tech.com.cn",
      currentDeploymentStatus: "deployed_pending_verification",
      fetcher: async (url) => ({
        ok: false,
        status: 500,
        url,
        text: async () => completeHtml()
      })
    });

    const transition = await transitionDeploymentStatusToVerified({
      statusPath,
      report,
      verificationCommand: "live-check"
    });
    const next = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;

    expect(transition.updated).toBe(false);
    expect(next.deploymentStatus).toBe("deployed_pending_verification");
  });
});
