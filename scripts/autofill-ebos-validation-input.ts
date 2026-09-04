import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getWeeklyWindow } from "@/lib/ebos/date-window";
import { normalizeValidationResultInput } from "@/lib/ebos/validation";
import {
  buildValidationAutofillChanges,
  buildValidationCaptureReport,
  readValidationAnalytics,
  readValidationOrders,
  renderValidationCaptureReportMarkdown,
  writeValidationInputSafely
} from "@/lib/ebos/validation-capture";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const apply = hasFlag("--apply");
  const force = hasFlag("--force");
  const dryRun = !apply;
  const targetDateObject = new Date(`${targetDate}T12:00:00`);
  const window = getWeeklyWindow(targetDateObject);
  const inputPath = resolve(
    process.cwd(),
    readArg("--input") ?? `reports/ebos/validation/inputs/${targetDate}-validation-input.json`
  );
  const input = normalizeValidationResultInput(JSON.parse(await readFile(inputPath, "utf8")));
  const analyticsSummary = await readValidationAnalytics({ periodStart: window.start, periodEnd: window.end });
  const orderSummary = await readValidationOrders({ periodStart: window.start, periodEnd: window.end });
  const capture = buildValidationCaptureReport({
    targetDate,
    periodStart: toDateKey(window.start),
    periodEnd: toDateKey(window.end),
    inputPath: toPortablePath(inputPath),
    input,
    analyticsSummary,
    orderSummary
  });
  const changes = buildValidationAutofillChanges({ capture, input, force });
  const writerResult = await writeValidationInputSafely({
    inputPath,
    dryRun,
    force,
    changes
  });
  const captureWithBackup = {
    ...capture,
    ...(writerResult.backupPath ? { backupPath: toPortablePath(writerResult.backupPath) } : {}),
    autofillSummary: {
      candidateChanges: changes.length,
      applicableChanges: changes.filter((change) => change.applied).length,
      skippedChanges: changes.filter((change) => !change.applied).length,
      appliedChanges: writerResult.appliedChanges.length
    },
    appliedChanges: writerResult.appliedChanges.length ? writerResult.appliedChanges : capture.appliedChanges,
    skippedChanges: writerResult.skippedChanges.length ? writerResult.skippedChanges : capture.skippedChanges
  };

  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "capture");
  const jsonPath = resolve(outputDir, `${targetDate}-validation-capture-report.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-validation-capture-report.md`);
  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(captureWithBackup, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderValidationCaptureReportMarkdown(captureWithBackup)}\n`, "utf8");

  console.log("EBOS validation autofill summary:");
  console.log(`- dryRun: ${dryRun ? "yes" : "no"}`);
  console.log(`- backup path: ${writerResult.backupPath ?? "none"}`);
  console.log(`- applied changes count: ${writerResult.appliedChanges.length}`);
  console.log(`- skipped changes count: ${writerResult.skippedChanges.length}`);
  console.log(`- validation input path: ${inputPath}`);
  console.log(`- capture report JSON: ${jsonPath}`);
  console.log("- next commands:");
  console.log(`  npx tsx scripts/check-ebos-validation-input.ts --date ${targetDate}`);
  console.log(`  npx tsx scripts/generate-ebos-validation-report.ts --date ${targetDate}`);

  if (apply) {
    runLocalTsx("scripts/check-ebos-validation-input.ts", "--date", targetDate);
    runLocalTsx("scripts/generate-ebos-validation-report.ts", "--date", targetDate);
  }
}

function runLocalTsx(...args: string[]) {
  const result = process.platform === "win32"
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["npx", "tsx", ...args].map(quoteCmdArg).join(" ")], {
      cwd: process.cwd(),
      stdio: "inherit"
    })
    : spawnSync("npx", ["tsx", ...args], {
      cwd: process.cwd(),
      stdio: "inherit"
    });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: npx tsx ${args.join(" ")}`);
  }
}

function quoteCmdArg(value: string) {
  return /^[A-Za-z0-9_./:=\\-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`;
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toPortablePath(value: string) {
  return value.replace(/\\/g, "/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
