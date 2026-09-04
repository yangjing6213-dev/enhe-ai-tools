import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { backupValidationInput, writeValidationInputSafely } from "../validation-input-writer";

let testDir = "";

beforeEach(async () => {
  testDir = join(tmpdir(), `ebos-validation-writer-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  if (testDir) await rm(testDir, { recursive: true, force: true });
});

async function createInput() {
  const inputPath = join(testDir, "2026-07-03-validation-input.json");
  await writeFile(inputPath, JSON.stringify({
    results: [
      {
        planId: "validation-direction-3-ai-prompt-kit",
        status: "running",
        ctaClicks: 5,
        notes: "keep notes",
        userFeedback: ["keep feedback"]
      }
    ]
  }, null, 2), "utf8");
  return inputPath;
}

describe("validation input writer", () => {
  it("dryRun does not write the file", async () => {
    const inputPath = await createInput();
    const before = await readFile(inputPath, "utf8");
    const result = await writeValidationInputSafely({
      inputPath,
      dryRun: true,
      changes: [{
        planId: "validation-direction-3-ai-prompt-kit",
        field: "ctaClicks",
        oldValue: 5,
        newValue: 8,
        source: "analytics",
        confidence: "high",
        reason: "test",
        applied: false
      }]
    });

    expect(await readFile(inputPath, "utf8")).toBe(before);
    expect(result.backupPath).toBeUndefined();
    expect(result.appliedChanges).toHaveLength(0);
  });

  it("creates a backup before applying", async () => {
    const inputPath = await createInput();
    const backupPath = await backupValidationInput(inputPath, { backupDir: join(testDir, "backups") });

    expect(JSON.parse(await readFile(backupPath, "utf8")).results[0].notes).toBe("keep notes");
  });

  it("does not break notes or userFeedback when applying", async () => {
    const inputPath = await createInput();
    await writeValidationInputSafely({
      inputPath,
      dryRun: false,
      backupDir: join(testDir, "backups"),
      force: true,
      changes: [{
        planId: "validation-direction-3-ai-prompt-kit",
        field: "ctaClicks",
        oldValue: 5,
        newValue: 8,
        source: "analytics",
        confidence: "high",
        reason: "test",
        applied: false
      }]
    });
    const after = JSON.parse(await readFile(inputPath, "utf8"));

    expect(after.results[0].ctaClicks).toBe(8);
    expect(after.results[0].notes).toBe("keep notes");
    expect(after.results[0].userFeedback).toEqual(["keep feedback"]);
  });

  it("only force overwrites an existing higher field", async () => {
    const inputPath = await createInput();
    const change = {
      planId: "validation-direction-3-ai-prompt-kit",
      field: "ctaClicks",
      oldValue: 5,
      newValue: 2,
      source: "analytics" as const,
      confidence: "high" as const,
      reason: "test",
      applied: false
    };

    const dry = await writeValidationInputSafely({ inputPath, dryRun: false, backupDir: join(testDir, "backups"), changes: [change] });
    let after = JSON.parse(await readFile(inputPath, "utf8"));
    expect(dry.appliedChanges).toHaveLength(0);
    expect(after.results[0].ctaClicks).toBe(5);

    await writeValidationInputSafely({ inputPath, dryRun: false, backupDir: join(testDir, "backups"), force: true, changes: [change] });
    after = JSON.parse(await readFile(inputPath, "utf8"));
    expect(after.results[0].ctaClicks).toBe(2);
  });
});
