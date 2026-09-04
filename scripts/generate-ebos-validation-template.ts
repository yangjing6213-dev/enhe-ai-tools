import { mkdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import {
  buildValidationTrackerFromDecisionReport,
  createValidationInputExample,
  renderValidationTrackerMarkdown
} from "@/lib/ebos/validation";

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
  const decisionReportPath = readArg("--decision-report") ?? undefined;
  const tracker = await buildValidationTrackerFromDecisionReport({
    targetDate,
    decisionReportPath
  });
  const templateDir = resolve(process.cwd(), "reports", "ebos", "validation", "templates");
  const inputDir = resolve(process.cwd(), "reports", "ebos", "validation", "inputs");
  const trackerJsonPath = resolve(templateDir, `${targetDate}-validation-tracker.json`);
  const trackerMarkdownPath = resolve(templateDir, `${targetDate}-validation-tracker.md`);
  const inputExamplePath = resolve(inputDir, `${targetDate}-validation-input.example.json`);
  const trackerRelativePath = toPortablePath(relative(process.cwd(), trackerJsonPath));
  const inputExample = createValidationInputExample(tracker, trackerRelativePath);

  await mkdir(templateDir, { recursive: true });
  await mkdir(inputDir, { recursive: true });
  await writeFile(trackerJsonPath, `${JSON.stringify(tracker, null, 2)}\n`, "utf8");
  await writeFile(trackerMarkdownPath, `${renderValidationTrackerMarkdown(tracker)}\n`, "utf8");
  await writeFile(inputExamplePath, `${JSON.stringify(inputExample, null, 2)}\n`, "utf8");

  console.log("EBOS validation tracker generated:");
  console.log(`- Tracker JSON: ${trackerJsonPath}`);
  console.log(`- Tracker Markdown: ${trackerMarkdownPath}`);
  console.log(`- Input example: ${inputExamplePath}`);
  console.log(`- Plans count: ${tracker.validationPlans.length}`);
  console.log(`- Top priority direction: ${tracker.topPriorityDirection}`);
  console.log("- How to fill:");
  for (const instruction of tracker.instructions) {
    console.log(`  - ${instruction}`);
  }
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
