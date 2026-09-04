import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  analyzeValidationResults,
  buildValidationTrackerFromDecisionReport,
  readValidationResultInputForDate,
  readValidationResultInput,
  renderValidationResultReportMarkdown,
  type EbosValidationResultReport,
  type EbosValidationTracker,
  type EbosValidationWarning
} from "@/lib/ebos/validation";
import {
  readValidationCaptureReportForDate,
  summarizeCaptureForValidationReport
} from "@/lib/ebos/validation-capture";
import { readExternalIntakeStatusForDate } from "@/lib/ebos/validation-intake";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const trackerPath = resolve(process.cwd(), readArg("--tracker") ?? `reports/ebos/validation/templates/${targetDate}-validation-tracker.json`);
  const inputArg = readArg("--input");
  const inputPath = inputArg ? resolve(process.cwd(), inputArg) : undefined;
  const tracker = await readTrackerOrFallback(trackerPath, targetDate);
  const readResult = inputPath
    ? await readValidationResultInput(inputPath)
    : await readValidationResultInputForDate({ targetDate });
  const readWarnings = readResult.warnings.length
    ? { ...readResult.input, warnings: [...(readResult.input.warnings ?? []), ...readResult.warnings] }
    : readResult.input;
  const effectiveInputPath = inputPath ?? ("filePath" in readResult && typeof readResult.filePath === "string"
    ? resolve(process.cwd(), readResult.filePath)
    : undefined);
  const capture = await readValidationCaptureReportForDate({ targetDate });
  const externalIntakeSummary = await readExternalIntakeStatusForDate({ targetDate });
  const baseReport = analyzeValidationResults(tracker, readWarnings, {
    trackerPath: toPortablePath(relative(process.cwd(), trackerPath)),
    ...(effectiveInputPath ? { inputPath: toPortablePath(relative(process.cwd(), effectiveInputPath)) } : {})
  });
  const report = {
    ...baseReport,
    ...(capture
      ? {
        captureReportPath: toPortablePath(relative(process.cwd(), resolve(process.cwd(), capture.filePath))),
        captureSummary: summarizeCaptureForValidationReport(capture.report)
      }
      : {}),
    externalIntakeSummary
  };
  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "reports");
  const reportMarkdownPath = resolve(outputDir, `${targetDate}-validation-result-report.md`);
  const reportJsonPath = resolve(outputDir, `${targetDate}-validation-result-report.json`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(reportMarkdownPath, `${renderValidationResultReportMarkdown(report)}\n`, "utf8");
  await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const counts = countStatuses(report);
  console.log("EBOS validation result report generated:");
  console.log(`- Markdown: ${reportMarkdownPath}`);
  console.log(`- JSON: ${reportJsonPath}`);
  console.log(`- overallValidationScore: ${report.overallValidationScore}`);
  console.log(`- success / partial / failed / inconclusive: ${counts.success} / ${counts.partial_success} / ${counts.failed} / ${counts.inconclusive}`);
  console.log(`- not_started: ${counts.not_started}`);
  console.log(`- continue / adjust / stop / scale: ${report.continueDirections.length} / ${report.adjustDirections.length} / ${report.stopDirections.length} / ${report.scaleDirections.length}`);
  console.log(`- Capture report used: ${capture?.report ? "yes" : "no"}`);
  if (report.captureSummary) {
    console.log(`- Capture ctaClicksDetected: ${report.captureSummary.ctaClicksDetected}`);
    console.log(`- Capture manualSlots: ${report.captureSummary.manualSlotsCount}`);
  }
  console.log(`- External intake status: ${externalIntakeSummary.status}`);
  console.log(`- External intake imported channels/plans: ${externalIntakeSummary.importedChannelsCount}/${externalIntakeSummary.importedPlansCount}`);
}

async function readTrackerOrFallback(
  trackerPath: string,
  targetDate: string
): Promise<EbosValidationTracker> {
  try {
    const tracker = JSON.parse(await readFile(trackerPath, "utf8")) as EbosValidationTracker;
    if (tracker.trackerType === "validation_tracker") return tracker;
  } catch {
    // Fall through to a fresh tracker. Missing manual input must not crash the script.
  }

  const fallback = await buildValidationTrackerFromDecisionReport({ targetDate });
  return {
    ...fallback,
    warnings: [
      ...fallback.warnings,
      {
        code: "validation_tracker_missing",
        severity: "warning",
        message: `Tracker ${trackerPath} could not be read; generated report from decision report fallback.`
      } satisfies EbosValidationWarning
    ]
  };
}

function countStatuses(report: EbosValidationResultReport) {
  return report.analyses.reduce((counts, analysis) => {
    counts[analysis.successStatus] += 1;
    return counts;
  }, {
    success: 0,
    partial_success: 0,
    failed: 0,
    inconclusive: 0,
    not_started: 0
  });
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
