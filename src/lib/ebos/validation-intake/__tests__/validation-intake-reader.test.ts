import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  normalizeExternalIntakeInput,
  parseMarkdownIntakeTable,
  readExternalIntakeInput,
  readExternalIntakeStatusForDate
} from "../validation-intake-reader";

describe("external intake reader", () => {
  test("reads JSON intake input", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-intake-reader-"));
    const inputPath = join(root, "input.json");
    await writeFile(inputPath, JSON.stringify({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu"],
      planResults: [{
        channel: "xianyu",
        targetPlanId: "plan-1",
        views: 12
      }]
    }), "utf8");

    const result = await readExternalIntakeInput(inputPath);

    expect(result.warnings).toEqual([]);
    expect(result.input.planResults[0]).toEqual(expect.objectContaining({
      channel: "xianyu",
      targetPlanId: "plan-1",
      views: 12
    }));
  });

  test("normalizes missing numeric and array fields", () => {
    const input = normalizeExternalIntakeInput({
      targetDate: "2026-07-03",
      planResults: [{ channel: "wechat", targetPlanId: "plan-1" }]
    });

    expect(input.inputType).toBe("external_channel_intake_input");
    expect(input.planResults[0]).toEqual(expect.objectContaining({
      views: 0,
      clicks: 0,
      messages: 0,
      paidOrders: 0,
      revenue: 0,
      userFeedback: []
    }));
  });

  test("parses markdown table rows", () => {
    const records = parseMarkdownIntakeTable(`
| channel | targetPlanId | views | clicks | messages | paidOrders | revenue | userFeedback | notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| xiaohongshu | plan-1 | 100 | 5 | 2 | 0 | 0 | wants a demo; asks price | launch note |
`);

    expect(records).toEqual([expect.objectContaining({
      channel: "xiaohongshu",
      targetPlanId: "plan-1",
      views: 100,
      clicks: 5,
      messages: 2,
      userFeedback: ["wants a demo", "asks price"],
      notes: "launch note"
    })]);
  });

  test("returns warnings instead of throwing for damaged JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-intake-reader-"));
    const inputPath = join(root, "broken.json");
    await writeFile(inputPath, "{broken", "utf8");

    const result = await readExternalIntakeInput(inputPath);

    expect(result.input.planResults).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "external_intake_parse_failed"
    }));
  });

  test("treats zero-change apply reports as generated but unfilled", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-intake-status-"));
    const importDir = join(root, "validation", "intake", "imports");
    await mkdir(importDir, { recursive: true });
    await writeFile(join(importDir, "2026-07-03-external-intake-import-report.json"), JSON.stringify({
      targetDate: "2026-07-03",
      inputPath: "external-input.json",
      validationInputPath: "validation-input.json",
      dryRun: false,
      appliedChanges: [],
      skippedChanges: [],
      validationWarnings: [],
      dataQualityWarnings: [],
      importedChannelsCount: 0,
      importedPlansCount: 0,
      summary: "Imported 0 changes."
    }), "utf8");

    const status = await readExternalIntakeStatusForDate({
      targetDate: "2026-07-03",
      reportsRoot: root
    });

    expect(status.status).toBe("template_generated_unfilled");
    expect(status.summary).toContain("尚未填写真实外部渠道数据");
  });
});
