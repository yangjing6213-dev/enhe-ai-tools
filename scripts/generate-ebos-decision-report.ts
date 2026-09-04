import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildEbosDecisionReport,
  renderDecisionReportMarkdown
} from "@/lib/ebos/decision";
import { readLatestValidationResultReport } from "@/lib/ebos/validation";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1] ?? null;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function parseTargetDate() {
  const value = readArg("--date");
  if (!value) return new Date();
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return date;
}

async function main() {
  const targetDate = parseTargetDate();
  const validationResult = await readLatestValidationResultReport({ targetDate });
  const report = await buildEbosDecisionReport({
    targetDate,
    validationResultReport: validationResult?.report ?? null
  });
  const markdown = renderDecisionReportMarkdown(report);
  const outputDir = resolve(process.cwd(), "reports", "ebos", "decision");
  const markdownPath = resolve(outputDir, `${report.targetDate}-decision-report.md`);
  const jsonPath = resolve(outputDir, `${report.targetDate}-decision-report.json`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(markdownPath, markdown, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("EBOS decision report generated:");
  console.log(`- top priority direction: ${report.priorityProductDirections[0]?.name ?? "none"}`);
  console.log(`- top existing product: ${report.priorityExistingProducts[0]?.productName ?? "none"}`);
  console.log(`- validation plans count: ${report.validationPlans.length}`);
  console.log(`- doNext count: ${report.doNext.length}`);
  console.log(`- codexTasks count: ${report.codexTasks.length}`);
  console.log(`- confidence: ${report.overallConfidence}`);
  console.log(`- validation result report used: ${validationResult?.report ? "yes" : "no"}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log("- Note: decision_report is not an evidence kind and is not written into the EBOS evidence catalog.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
