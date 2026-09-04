import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { normalizeValidationResultInput } from "../validation";
import { mapExternalIntakeToValidationChanges } from "./validation-intake-mapper";
import { readExternalIntakeInput } from "./validation-intake-reader";
import { validateExternalIntakeInput } from "./validation-intake-validator";
import type {
  EbosExternalIntakeImportResult,
  EbosExternalIntakeWarning
} from "./validation-intake-types";

export async function applyExternalIntakeChanges(options: {
  targetDate: string;
  inputPath: string;
  validationInputPath: string;
  reportsRoot?: string;
  dryRun?: boolean;
  force?: boolean;
  now?: string | Date;
}): Promise<EbosExternalIntakeImportResult> {
  const dryRun = options.dryRun !== false;
  const readResult = await readExternalIntakeInput(options.inputPath);
  const validation = validateExternalIntakeInput(readResult.input);
  const validationInput = normalizeValidationResultInput(JSON.parse(await readFile(options.validationInputPath, "utf8")));
  const mapped = mapExternalIntakeToValidationChanges(validation.input, validationInput, { force: options.force });
  const dataQualityWarnings = [
    ...readResult.warnings,
    ...validation.warnings
  ];
  const baseResult: EbosExternalIntakeImportResult = {
    targetDate: options.targetDate,
    inputPath: options.inputPath,
    validationInputPath: options.validationInputPath,
    dryRun,
    appliedChanges: mapped.appliedChanges,
    skippedChanges: mapped.skippedChanges,
    validationWarnings: validation.isValid ? [] : validation.warnings,
    dataQualityWarnings,
    importedChannelsCount: mapped.importedChannelsCount,
    importedPlansCount: mapped.importedPlansCount,
    summary: dryRun
      ? `Dry-run found ${mapped.appliedChanges.length} external intake changes for ${mapped.importedChannelsCount} channels and ${mapped.importedPlansCount} plans.`
      : `Imported ${mapped.appliedChanges.length} external intake changes for ${mapped.importedChannelsCount} channels and ${mapped.importedPlansCount} plans.`
  };

  if (dryRun) return baseResult;

  const backupPath = await backupBeforeExternalIntakeImport(options.validationInputPath, {
    reportsRoot: options.reportsRoot,
    targetDate: options.targetDate,
    now: options.now
  });
  if (mapped.appliedChanges.length > 0) {
    await writeFile(options.validationInputPath, `${JSON.stringify(mapped.validationInput, null, 2)}\n`, "utf8");
  }
  const reportPaths = await writeExternalIntakeImportReport({
    ...baseResult,
    backupPath,
    dryRun: false
  }, {
    reportsRoot: options.reportsRoot
  });

  return {
    ...baseResult,
    backupPath,
    dryRun: false,
    importReportJsonPath: reportPaths.jsonPath,
    importReportMarkdownPath: reportPaths.markdownPath
  };
}

export async function backupBeforeExternalIntakeImport(inputPath: string, options: {
  reportsRoot?: string;
  targetDate?: string;
  now?: string | Date;
} = {}) {
  const targetDate = options.targetDate ?? inferDateFromPath(inputPath);
  const backupDir = join(options.reportsRoot ?? "reports/ebos", "validation", "intake", "backups");
  const timestamp = toIso(options.now ?? new Date()).replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `${targetDate}-validation-input.before-external-intake.${timestamp}.json`);

  await mkdir(backupDir, { recursive: true });
  await copyFile(inputPath, backupPath);
  return backupPath;
}

export async function writeExternalIntakeImportReport(
  result: EbosExternalIntakeImportResult,
  options: { reportsRoot?: string } = {}
) {
  const outputDir = join(options.reportsRoot ?? "reports/ebos", "validation", "intake", "imports");
  const jsonPath = join(outputDir, `${result.targetDate}-external-intake-import-report.json`);
  const markdownPath = join(outputDir, `${result.targetDate}-external-intake-import-report.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderImportReportMarkdown(result)}\n`, "utf8");
  return { jsonPath, markdownPath };
}

function renderImportReportMarkdown(result: EbosExternalIntakeImportResult) {
  return [
    "# EBOS External Intake Import Report",
    "",
    `Target date: ${result.targetDate}`,
    `Input: ${result.inputPath}`,
    `Validation input: ${result.validationInputPath}`,
    `Dry run: ${String(result.dryRun)}`,
    result.backupPath ? `Backup: ${result.backupPath}` : "",
    "",
    "## Summary",
    result.summary,
    "",
    "## Applied changes",
    list(result.appliedChanges.map((change) => `${change.planId}.${change.field}: ${String(change.oldValue)} -> ${String(change.newValue)} (${change.reason})`)),
    "",
    "## Skipped changes",
    list(result.skippedChanges.map((change) => `${change.planId}.${change.field}: ${change.reason}`)),
    "",
    "## Data quality warnings",
    list(formatWarnings(result.dataQualityWarnings)),
    "",
    "## Still needs user data",
    result.importedChannelsCount === 0
      ? "- No real external channel signals were imported. Fill the local intake file with observed data only."
      : "- Continue collecting real external views, clicks, messages, orders, revenue, refunds, and user feedback."
  ].filter((line) => line !== "").join("\n");
}

function formatWarnings(warnings: EbosExternalIntakeWarning[]) {
  return warnings.map((warning) => `[${warning.severity}] ${warning.message}`);
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function inferDateFromPath(filePath: string) {
  return basename(filePath).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "unknown-date";
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
