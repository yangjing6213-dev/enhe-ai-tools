import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildManualServerCommandPackage
} from "@/lib/ebos/deployment-execution";
import {
  buildManualServerDeploymentResultExample,
  readCommandResults,
  renderProductionDeploymentExecutionMarkdown,
  summarizeExecutionProgress
} from "@/lib/ebos/deployment-execution";
import { readDeploymentOperatorChecklist } from "@/lib/ebos/deployment-operator";

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
  if (!value) return formatDateKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Expected YYYY-MM-DD.`);
  }
  return value;
}

async function main() {
  const targetDate = parseTargetDate();
  const statusPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status.json`
  );
  const status = JSON.parse(await readFile(statusPath, "utf8"));
  const commandResults = await readCommandResults({ targetDate });
  const operatorChecklist = await readDeploymentOperatorChecklist({ targetDate });
  const manualServerCommandResults = [
    ...commandResults.serverCommandResults,
    ...commandResults.dockerCommandResults,
    ...commandResults.nginxCommandResults
  ];
  const fallbackManualResults = manualServerCommandResults.length > 0 || !operatorChecklist?.report
    ? manualServerCommandResults
    : buildManualServerCommandPackage({ operatorChecklist: operatorChecklist.report });
  const report = summarizeExecutionProgress({
    targetDate,
    executionStatus: status,
    localCommandResults: commandResults.localCommandResults,
    manualServerCommandResults: fallbackManualResults,
    statusTransition: {
      previousStatus: status.deploymentStatus,
      nextStatus: status.deploymentStatus,
      updated: false,
      reason: "Generated execution report without changing status.",
      warnings: [],
      forbiddenStatuses: ["verified"]
    },
    siteUrl: "https://www.enhe-tech.com.cn"
  });
  const outputRoot = resolve(process.cwd(), "reports", "ebos", "deployment", "execution");
  const jsonPath = resolve(outputRoot, "live", `${targetDate}-production-deployment-execution-report.json`);
  const markdownPath = resolve(outputRoot, "live", `${targetDate}-production-deployment-execution-report.md`);
  const examplePath = resolve(outputRoot, "command-results", `${targetDate}-server-deployment-result.example.json`);

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(examplePath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderProductionDeploymentExecutionMarkdown(report)}\n`, "utf8");
  await writeFile(examplePath, `${JSON.stringify(buildManualServerDeploymentResultExample(), null, 2)}\n`, "utf8");

  console.log("EBOS production deployment execution report generated:");
  console.log(`- deploymentStatus: ${report.executionStatus.deploymentStatus}`);
  console.log(`- localCommandResults: ${report.localCommandResults.length}`);
  console.log(`- manualRequiredCommands: ${
    report.serverCommandResults.length + report.dockerCommandResults.length + report.nginxCommandResults.length
  }`);
  console.log(`- postLaunchCheckAllowed: ${report.verificationReadiness.postLaunchCheckAllowed}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- Server result example: ${examplePath}`);
  console.log("- status changed: no");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
