import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildValidationLaunchRunbook,
  readLatestValidationLaunchReadinessReport,
  renderValidationLaunchRunbookMarkdown
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
  const readiness = await readLatestValidationLaunchReadinessReport({ targetDate });
  const runbook = buildValidationLaunchRunbook({
    targetDate,
    readinessReport: readiness?.report,
    readinessReportPath: readiness?.filePath
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "launch");
  const jsonPath = resolve(outputDir, `${targetDate}-validation-launch-runbook.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-validation-launch-runbook.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(runbook, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderValidationLaunchRunbookMarkdown(runbook)}\n`, "utf8");

  console.log("EBOS validation launch runbook generated:");
  console.log(`- launch objective: ${runbook.launchObjective}`);
  console.log(`- codex steps count: ${runbook.codexSteps.length}`);
  console.log(`- user minimum actions count: ${runbook.userMinimumActions.length}`);
  console.log(`- external channel steps count: ${runbook.externalChannelSteps.length}`);
  console.log(`- postLaunchCommands count: ${runbook.postLaunchCommands.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- Readiness report used: ${readiness?.report ? "yes" : "no"}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
