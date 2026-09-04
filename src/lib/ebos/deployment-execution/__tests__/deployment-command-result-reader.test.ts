import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildManualServerDeploymentResultExample,
  readCommandResults,
  readManualServerDeploymentResult,
  validateManualServerDeploymentResult
} from "../deployment-command-result-reader";

describe("deployment command result reader", () => {
  test("validates complete manual server deployment result", () => {
    const result = validateManualServerDeploymentResult({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T00:20:00.000Z",
      notes: "Completed",
      evidence: ["non-secret output summary"]
    });

    expect(result.valid).toBe(true);
    expect(result.complete).toBe(true);
  });

  test("does not treat incomplete manual server deployment result as complete", () => {
    const result = validateManualServerDeploymentResult({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: false,
      nginxCommandsCompleted: true,
      deployedAt: null,
      notes: "",
      evidence: []
    });

    expect(result.valid).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.blockers).toContain("dockerCommandsCompleted is false.");
  });

  test("reads user-provided manual server result JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ebos-result-"));
    const filePath = join(dir, "server-result.json");
    await writeFile(filePath, JSON.stringify({
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T00:20:00.000Z",
      notes: "Completed",
      evidence: ["non-secret output summary"]
    }), "utf8");

    const result = await readManualServerDeploymentResult(filePath);

    expect(result.validation.complete).toBe(true);
    expect(result.result.serverCommandsCompleted).toBe(true);
  });

  test("reads new server deployment result input without ignoring failures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ebos-result-input-"));
    const filePath = join(dir, "server-deployment-result.json");
    await writeFile(filePath, JSON.stringify({
      inputType: "server_deployment_result_input",
      targetDate: "2026-07-03",
      serverCommandsCompleted: true,
      dockerCommandsCompleted: true,
      nginxCommandsCompleted: true,
      deployedAt: "2026-07-05T00:20:00.000Z",
      commandSummaries: ["server commands completed"],
      failures: ["nginx reload failed once"],
      notes: "Completed with a failure record",
      evidence: ["non-secret output summary"]
    }), "utf8");

    const result = await readManualServerDeploymentResult(filePath);

    expect(result.validation.valid).toBe(true);
    expect(result.validation.complete).toBe(false);
    expect(result.validation.blockers).toContain("failures must be empty before transition.");
  });

  test("builds server result template with false defaults", () => {
    expect(buildManualServerDeploymentResultExample()).toEqual({
      serverCommandsCompleted: false,
      dockerCommandsCompleted: false,
      nginxCommandsCompleted: false,
      deployedAt: null,
      notes: "",
      evidence: []
    });
  });

  test("reads command result arrays from command-results directory", async () => {
    const reportsRoot = await mkdtemp(join(tmpdir(), "ebos-command-results-"));
    const dir = join(reportsRoot, "deployment", "execution", "command-results");
    await writeFile(join(dir, "placeholder"), "", "utf8").catch(async () => {
      await import("node:fs/promises").then(({ mkdir }) => mkdir(dir, { recursive: true }));
      await writeFile(join(dir, "2026-07-03-local-command-results.json"), JSON.stringify([
        {
          id: "local-lint",
          command: "npm run lint",
          environment: "local",
          status: "success",
          summary: "passed",
          warnings: []
        }
      ]), "utf8");
    });

    const result = await readCommandResults({ targetDate: "2026-07-03", reportsRoot });

    expect(result.localCommandResults).toHaveLength(1);
    expect(result.serverCommandResults).toHaveLength(0);
  });
});
