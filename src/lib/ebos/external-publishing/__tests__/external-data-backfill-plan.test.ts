import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  buildExternalDataBackfillPlan,
  mapPublishResultsToExternalIntake,
  writeMappedExternalIntake
} from "../external-data-backfill-plan";
import { buildExternalPublishResultInputTemplate } from "../external-publish-status-template";

describe("external data backfill plan", () => {
  test("maps every publish channel into external intake records", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults = input.channelResults.map((result) => ({ ...result, views: 1 }));

    const mapped = mapPublishResultsToExternalIntake(input, { targetPlanId: "plan-1" });

    expect(mapped.planResults).toHaveLength(6);
    expect(mapped.planResults.map((record) => record.channel)).toEqual([
      "xianyu",
      "taobao",
      "whop",
      "xiaohongshu",
      "wechat",
      "manual_outreach"
    ]);
  });

  test("does not overwrite existing higher values when merging", () => {
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults[0] = { ...input.channelResults[0], views: 5, messages: 2 };

    const plan = buildExternalDataBackfillPlan({
      input,
      targetPlanId: "plan-1",
      existingExternalIntake: {
        inputType: "external_channel_intake_input",
        targetDate: "2026-07-03",
        channels: ["xianyu"],
        planResults: [{
          channel: "xianyu",
          targetPlanId: "plan-1",
          views: 10,
          messages: 1
        }],
        notes: []
      }
    });
    const xianyu = plan.mergedInput.planResults.find((record) => record.channel === "xianyu");

    expect(xianyu?.views).toBe(10);
    expect(xianyu?.messages).toBe(2);
  });

  test("dry-run writes only a report and does not change external intake input", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-publish-backfill-"));
    const inputPath = join(root, "external-publish-result-input.json");
    const externalIntakeInputPath = join(root, "external-intake-input.json");
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults[0] = { ...input.channelResults[0], views: 10 };
    await writeFile(inputPath, JSON.stringify(input, null, 2), "utf8");
    await writeFile(externalIntakeInputPath, JSON.stringify({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu"],
      planResults: [],
      notes: []
    }, null, 2), "utf8");
    const before = await readFile(externalIntakeInputPath, "utf8");

    const report = await writeMappedExternalIntake({
      targetDate: "2026-07-03",
      inputPath,
      externalIntakeInputPath,
      reportsRoot: root,
      apply: false,
      now: "2026-07-05T00:00:00.000Z"
    });

    expect(report.dryRun).toBe(true);
    expect(report.applied).toBe(false);
    expect(await readFile(externalIntakeInputPath, "utf8")).toBe(before);
  });

  test("apply creates backup before writing when real signals exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-publish-backfill-"));
    const inputPath = join(root, "external-publish-result-input.json");
    const externalIntakeInputPath = join(root, "external-intake-input.json");
    const input = buildExternalPublishResultInputTemplate({ targetDate: "2026-07-03" });
    input.channelResults[0] = { ...input.channelResults[0], views: 10, messages: 1 };
    await writeFile(inputPath, JSON.stringify(input, null, 2), "utf8");
    await writeFile(externalIntakeInputPath, JSON.stringify({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu"],
      planResults: [],
      notes: []
    }, null, 2), "utf8");

    const report = await writeMappedExternalIntake({
      targetDate: "2026-07-03",
      inputPath,
      externalIntakeInputPath,
      reportsRoot: root,
      apply: true,
      now: "2026-07-05T00:00:00.000Z"
    });
    const updated = JSON.parse(await readFile(externalIntakeInputPath, "utf8"));

    expect(report.applied).toBe(true);
    expect(report.backupPath).toContain("before-publish-backfill");
    expect(updated.planResults[0]).toEqual(expect.objectContaining({ views: 10, messages: 1 }));
  });
});
