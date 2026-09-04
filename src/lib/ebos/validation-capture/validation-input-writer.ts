import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { EbosValidationInputFile } from "../validation";
import type { EbosValidationAutofillChange } from "./validation-capture-types";

export type ApplyAutofillChangesResult = {
  input: EbosValidationInputFile;
  appliedChanges: EbosValidationAutofillChange[];
  skippedChanges: EbosValidationAutofillChange[];
};

export type WriteValidationInputResult = {
  inputPath: string;
  backupPath?: string;
  dryRun: boolean;
  appliedChanges: EbosValidationAutofillChange[];
  skippedChanges: EbosValidationAutofillChange[];
};

export async function backupValidationInput(
  inputPath: string,
  options: { backupDir?: string; timestamp?: string | Date } = {}
) {
  const dateKey = basename(inputPath).match(/^(\d{4}-\d{2}-\d{2})-validation-input\.json$/)?.[1] ?? "unknown-date";
  const timestamp = toBackupTimestamp(options.timestamp ?? new Date());
  const backupDir = options.backupDir ?? resolve(dirname(inputPath), "..", "backups");
  const backupPath = resolve(backupDir, `${dateKey}-validation-input.backup.${timestamp}.json`);

  await mkdir(backupDir, { recursive: true });
  await copyFile(inputPath, backupPath);
  return backupPath;
}

export async function writeValidationInputSafely(options: {
  inputPath: string;
  changes: EbosValidationAutofillChange[];
  dryRun?: boolean;
  force?: boolean;
  backupDir?: string;
  timestamp?: string | Date;
}): Promise<WriteValidationInputResult> {
  const dryRun = options.dryRun ?? true;
  const source = await readFile(options.inputPath, "utf8");
  const input = JSON.parse(source) as EbosValidationInputFile;
  const applied = applyAutofillChanges(input, options.changes, { force: options.force });

  if (dryRun) {
    return {
      inputPath: options.inputPath,
      dryRun: true,
      appliedChanges: [],
      skippedChanges: [...applied.appliedChanges, ...applied.skippedChanges]
    };
  }

  const backupPath = await backupValidationInput(options.inputPath, {
    backupDir: options.backupDir,
    timestamp: options.timestamp
  });
  await writeFile(options.inputPath, `${JSON.stringify(applied.input, null, 2)}\n`, "utf8");

  return {
    inputPath: options.inputPath,
    backupPath,
    dryRun: false,
    appliedChanges: applied.appliedChanges,
    skippedChanges: applied.skippedChanges
  };
}

export function applyAutofillChanges(
  input: EbosValidationInputFile,
  changes: EbosValidationAutofillChange[],
  options: { force?: boolean; includeLowConfidence?: boolean } = {}
): ApplyAutofillChangesResult {
  const cloned = JSON.parse(JSON.stringify(input)) as EbosValidationInputFile;
  const appliedChanges: EbosValidationAutofillChange[] = [];
  const skippedChanges: EbosValidationAutofillChange[] = [];

  for (const change of changes) {
    if (change.confidence === "low" && !options.includeLowConfidence) {
      skippedChanges.push({ ...change, applied: false, reason: `${change.reason} Skipped because confidence is low.` });
      continue;
    }

    const target = cloned.results.find((result) => result.planId === change.planId);
    if (!target) {
      skippedChanges.push({ ...change, applied: false, reason: `${change.reason} Plan was not found in validation input.` });
      continue;
    }

    const current = (target as Record<string, unknown>)[change.field];
    if (!shouldOverwrite(current, change.newValue, options.force)) {
      skippedChanges.push({
        ...change,
        oldValue: current,
        applied: false,
        reason: `${change.reason} Existing value was preserved.`
      });
      continue;
    }

    (target as Record<string, unknown>)[change.field] = change.newValue;
    appliedChanges.push({
      ...change,
      oldValue: current ?? change.oldValue,
      applied: true
    });
  }

  return { input: cloned, appliedChanges, skippedChanges };
}

function shouldOverwrite(current: unknown, next: unknown, force?: boolean) {
  if (force) return true;
  if (current === undefined || current === null || current === "") return true;
  if (typeof current === "number" && typeof next === "number") return next > current;
  if (Array.isArray(current)) return current.length === 0;
  return false;
}

function toBackupTimestamp(value: string | Date) {
  const raw = value instanceof Date ? value.toISOString() : value;
  return raw.replace(/[:.]/g, "-");
}

