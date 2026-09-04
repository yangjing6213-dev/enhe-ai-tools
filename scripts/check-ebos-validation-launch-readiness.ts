import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  checkValidationLaunchReadiness,
  renderValidationLaunchReadinessMarkdown
} from "@/lib/ebos/validation-launch";

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
  const report = await checkValidationLaunchReadiness({
    targetDate,
    projectRoot: process.cwd()
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "launch");
  const jsonPath = resolve(outputDir, `${targetDate}-validation-launch-readiness.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-validation-launch-readiness.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderValidationLaunchReadinessMarkdown(report)}\n`, "utf8");

  console.log("EBOS validation launch readiness generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- readinessScore: ${report.readinessScore}`);
  console.log(`- readinessStatus: ${report.readinessStatus}`);
  console.log(`- blockers count: ${report.blockers.length}`);
  console.log(`- warnings count: ${report.warnings.length}`);
  console.log("- nextActions:");
  for (const action of report.nextActions) {
    console.log(`  - ${action}`);
  }
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
