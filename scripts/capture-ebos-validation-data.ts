import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getWeeklyWindow } from "@/lib/ebos/date-window";
import { normalizeValidationResultInput } from "@/lib/ebos/validation";
import {
  buildValidationCaptureReport,
  readValidationAnalytics,
  readValidationOrders,
  renderValidationCaptureReportMarkdown
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

function parseTargetDateKey() {
  const value = readArg("--date");
  if (!value) return toDateKey(new Date());
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  return value.slice(0, 10);
}

async function main() {
  const targetDate = parseTargetDateKey();
  const targetDateObject = new Date(`${targetDate}T12:00:00`);
  const window = getWeeklyWindow(targetDateObject);
  const inputPath = resolve(
    process.cwd(),
    readArg("--input") ?? `reports/ebos/validation/inputs/${targetDate}-validation-input.json`
  );
  const input = normalizeValidationResultInput(JSON.parse(await readFile(inputPath, "utf8")));
  const analyticsSummary = await readValidationAnalytics({ periodStart: window.start, periodEnd: window.end });
  const orderSummary = await readValidationOrders({ periodStart: window.start, periodEnd: window.end });
  const report = buildValidationCaptureReport({
    targetDate,
    periodStart: toDateKey(window.start),
    periodEnd: toDateKey(window.end),
    inputPath: toPortablePath(inputPath),
    input,
    analyticsSummary,
    orderSummary
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "capture");
  const jsonPath = resolve(outputDir, `${targetDate}-validation-capture-report.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-validation-capture-report.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderValidationCaptureReportMarkdown(report)}\n`, "utf8");

  console.log("EBOS validation capture report generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- analyticsAvailable: ${report.analyticsSummary.analyticsAvailable}`);
  console.log(`- eventsDetected: ${report.analyticsSummary.eventsDetected}`);
  console.log(`- ctaClicksDetected: ${report.analyticsSummary.ctaClicksDetected}`);
  console.log(`- ordersAvailable: ${report.orderSummary.ordersAvailable}`);
  console.log(`- paidOrders: ${report.orderSummary.paidOrders}`);
  console.log(`- revenue: ${report.orderSummary.revenue}`);
  console.log(`- manualSlots count: ${report.manualDataSlots.length}`);
  console.log(`- warnings: ${report.warnings.length}`);
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

