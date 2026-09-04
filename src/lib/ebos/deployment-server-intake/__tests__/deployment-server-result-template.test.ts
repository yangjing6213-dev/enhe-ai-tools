import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildServerDeploymentResultInputTemplate,
  writeServerDeploymentResultInputTemplate
} from "../deployment-server-result-template";

describe("server deployment result template", () => {
  test("defaults all completion fields to false with empty evidence", () => {
    expect(buildServerDeploymentResultInputTemplate({ targetDate: "2026-07-03" })).toEqual({
      inputType: "server_deployment_result_input",
      targetDate: "2026-07-03",
      serverCommandsCompleted: false,
      dockerCommandsCompleted: false,
      nginxCommandsCompleted: false,
      deployedAt: null,
      commandSummaries: [],
      failures: [],
      evidence: [],
      notes: ""
    });
  });

  test("does not overwrite existing input unless force is true", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ebos-server-result-"));
    const filePath = join(dir, "server-deployment-result.json");
    await writeFile(filePath, "{\"custom\":true}\n", "utf8");

    const skipped = await writeServerDeploymentResultInputTemplate({ targetDate: "2026-07-03", filePath });
    const afterSkip = await readFile(filePath, "utf8");
    const forced = await writeServerDeploymentResultInputTemplate({ targetDate: "2026-07-03", filePath, force: true });
    const afterForce = JSON.parse(await readFile(filePath, "utf8"));

    expect(skipped.written).toBe(false);
    expect(afterSkip).toContain("\"custom\":true");
    expect(forced.written).toBe(true);
    expect(afterForce.serverCommandsCompleted).toBe(false);
  });
});
