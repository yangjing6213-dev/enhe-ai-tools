import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  applyExternalIntakeChanges,
  backupBeforeExternalIntakeImport,
  writeExternalIntakeImportReport
} from "../validation-intake-writer";

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "ebos-intake-writer-"));
  const inputPath = join(root, "external-input.json");
  const validationInputPath = join(root, "validation-input.json");
  await writeFile(inputPath, JSON.stringify({
    inputType: "external_channel_intake_input",
    targetDate: "2026-07-03",
    channels: ["xianyu"],
    planResults: [{
      channel: "xianyu",
      targetPlanId: "plan-1",
      views: 10,
      messages: 2,
      paidOrders: 1,
      revenue: 99
    }],
    notes: []
  }, null, 2), "utf8");
  await writeFile(validationInputPath, JSON.stringify({
    targetDate: "2026-07-03",
    results: [{ planId: "plan-1", status: "running", listingViews: 0 }]
  }, null, 2), "utf8");

  return { root, inputPath, validationInputPath };
}

describe("external intake writer", () => {
  test("dry-run does not write validation input or backup", async () => {
    const fixture = await createFixture();
    const before = await readFile(fixture.validationInputPath, "utf8");

    const result = await applyExternalIntakeChanges({
      targetDate: "2026-07-03",
      inputPath: fixture.inputPath,
      validationInputPath: fixture.validationInputPath,
      reportsRoot: fixture.root,
      dryRun: true,
      now: "2026-07-04T00:00:00.000Z"
    });

    expect(await readFile(fixture.validationInputPath, "utf8")).toBe(before);
    expect(result.dryRun).toBe(true);
    expect(result.backupPath).toBeUndefined();
    expect(result.appliedChanges.length).toBeGreaterThan(0);
  });

  test("apply writes validation input and creates backup", async () => {
    const fixture = await createFixture();

    const result = await applyExternalIntakeChanges({
      targetDate: "2026-07-03",
      inputPath: fixture.inputPath,
      validationInputPath: fixture.validationInputPath,
      reportsRoot: fixture.root,
      dryRun: false,
      now: "2026-07-04T00:00:00.000Z"
    });
    const updated = JSON.parse(await readFile(fixture.validationInputPath, "utf8"));

    expect(updated.results[0]).toEqual(expect.objectContaining({
      listingViews: 10,
      messages: 2,
      paidOrders: 1,
      revenue: 99
    }));
    expect(result.backupPath).toContain("before-external-intake");
    expect(result.importedChannelsCount).toBe(1);
    expect(result.importedPlansCount).toBe(1);
  });

  test("apply with no external signals creates report but does not rewrite validation input", async () => {
    const fixture = await createFixture();
    await writeFile(fixture.inputPath, JSON.stringify({
      inputType: "external_channel_intake_input",
      targetDate: "2026-07-03",
      channels: ["xianyu"],
      planResults: [{
        channel: "xianyu",
        targetPlanId: "plan-1",
        views: 0,
        messages: 0,
        paidOrders: 0,
        revenue: 0,
        userFeedback: []
      }],
      notes: []
    }, null, 2), "utf8");
    const before = await readFile(fixture.validationInputPath, "utf8");

    const result = await applyExternalIntakeChanges({
      targetDate: "2026-07-03",
      inputPath: fixture.inputPath,
      validationInputPath: fixture.validationInputPath,
      reportsRoot: fixture.root,
      dryRun: false
    });

    expect(await readFile(fixture.validationInputPath, "utf8")).toBe(before);
    expect(result.backupPath).toContain("before-external-intake");
    expect(result.importReportJsonPath).toContain("external-intake-import-report.json");
    expect(result.appliedChanges).toEqual([]);
  });

  test("force allows lower incoming values to overwrite existing metrics", async () => {
    const fixture = await createFixture();
    await writeFile(fixture.validationInputPath, JSON.stringify({
      targetDate: "2026-07-03",
      results: [{ planId: "plan-1", status: "running", listingViews: 20 }]
    }, null, 2), "utf8");

    const withoutForce = await applyExternalIntakeChanges({
      targetDate: "2026-07-03",
      inputPath: fixture.inputPath,
      validationInputPath: fixture.validationInputPath,
      reportsRoot: fixture.root,
      dryRun: true
    });
    const withForce = await applyExternalIntakeChanges({
      targetDate: "2026-07-03",
      inputPath: fixture.inputPath,
      validationInputPath: fixture.validationInputPath,
      reportsRoot: fixture.root,
      dryRun: true,
      force: true
    });

    expect(withoutForce.skippedChanges).toContainEqual(expect.objectContaining({ field: "listingViews" }));
    expect(withForce.appliedChanges).toContainEqual(expect.objectContaining({ field: "listingViews" }));
  });

  test("can create explicit backup and import report files", async () => {
    const fixture = await createFixture();
    const backupPath = await backupBeforeExternalIntakeImport(fixture.validationInputPath, {
      reportsRoot: fixture.root,
      targetDate: "2026-07-03",
      now: "2026-07-04T00:00:00.000Z"
    });
    const reportPaths = await writeExternalIntakeImportReport({
      targetDate: "2026-07-03",
      inputPath: fixture.inputPath,
      validationInputPath: fixture.validationInputPath,
      backupPath,
      dryRun: false,
      appliedChanges: [{ planId: "plan-1", field: "listingViews", oldValue: 0, newValue: 10, reason: "test" }],
      skippedChanges: [],
      validationWarnings: [],
      dataQualityWarnings: [],
      importedChannelsCount: 1,
      importedPlansCount: 1,
      summary: "Imported 1 channel."
    }, { reportsRoot: fixture.root });

    expect(await readFile(backupPath, "utf8")).toContain("plan-1");
    expect(reportPaths.jsonPath).toContain("external-intake-import-report.json");
    expect(await readFile(reportPaths.markdownPath, "utf8")).toContain("Imported 1 channel.");
  });
});
