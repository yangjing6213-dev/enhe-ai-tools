import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readLatestValidationLaunchReadinessReport, type EbosValidationLaunchRunbook } from "@/lib/ebos/validation-launch";
import {
  buildValidationLaunchExecutionReport,
  renderValidationLaunchExecutionMarkdown
} from "@/lib/ebos/validation-launch-execution";

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
  const runbook = await readLatestValidationLaunchRunbook({ targetDate });
  const report = await buildValidationLaunchExecutionReport({
    targetDate,
    readinessReport: readiness?.report,
    readinessReportPath: readiness?.filePath,
    runbook: runbook?.runbook,
    runbookPath: runbook?.filePath,
    assetsDir: "docs/ebos/validation-assets"
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "validation", "launch-execution");
  const jsonPath = resolve(outputDir, `${targetDate}-validation-launch-execution.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-validation-launch-execution.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderValidationLaunchExecutionMarkdown(report)}\n`, "utf8");

  console.log("EBOS validation launch execution generated:");
  console.log(`- launchStatus: ${report.launchStatus}`);
  console.log(`- deploymentChecklist count: ${report.deploymentChecklist.length}`);
  console.log(`- smokeTest count: ${report.smokeTestPlan.length}`);
  console.log(`- externalPublishAssets count: ${report.externalPublishPack.length}`);
  console.log(`- codex steps count: ${report.codexExecutableSteps.length}`);
  console.log(`- user minimum actions count: ${report.userMinimumActions.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- Readiness report used: ${readiness?.report ? "yes" : "no"}`);
  console.log(`- Runbook used: ${runbook?.runbook ? "yes" : "no"}`);
}

async function readLatestValidationLaunchRunbook(options: {
  targetDate?: string;
} = {}): Promise<{ filePath: string; runbook: EbosValidationLaunchRunbook } | null> {
  const directory = "reports/ebos/validation/launch";
  if (options.targetDate) {
    const exactPath = `${directory}/${options.targetDate}-validation-launch-runbook.json`;
    const exact = await readRunbookFile(exactPath);
    if (exact) return { filePath: exactPath, runbook: exact };
  }

  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-validation-launch-runbook.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const runbook = await readRunbookFile(filePath);
    return runbook ? { filePath, runbook } : null;
  } catch {
    return null;
  }
}

async function readRunbookFile(filePath: string) {
  try {
    const runbook = JSON.parse(await readFile(filePath, "utf8")) as EbosValidationLaunchRunbook;
    return runbook.runbookType === "validation_launch_operator_runbook" ? runbook : null;
  } catch {
    return null;
  }
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
