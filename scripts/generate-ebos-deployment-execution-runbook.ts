import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildDeploymentApprovalGate,
  buildDeploymentExecutionContract,
  buildDeploymentExecutionRunbook,
  renderDeploymentExecutionRunbookMarkdown,
  type EbosProductionDeploymentPlanReport
} from "@/lib/ebos";

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
  const siteUrl = readArg("--site-url") ?? "https://www.enhe-tech.com.cn";
  const deploymentPlanPath = resolve(process.cwd(), "reports", "ebos", "deployment", `${targetDate}-production-deployment-plan.json`);
  const deploymentPlanReport = JSON.parse(await readFile(deploymentPlanPath, "utf8")) as EbosProductionDeploymentPlanReport;
  const approvalGate = await buildDeploymentApprovalGate({
    targetDate,
    siteUrl,
    deploymentPlanReport
  });
  const executionContract = buildDeploymentExecutionContract({
    targetDate,
    deploymentPlanReport
  });
  const runbook = buildDeploymentExecutionRunbook({
    targetDate,
    siteUrl,
    approvalGate,
    executionContract
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "runbooks");
  const jsonPath = resolve(outputDir, `${targetDate}-deployment-execution-runbook.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-deployment-execution-runbook.md`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(runbook, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderDeploymentExecutionRunbookMarkdown(runbook)}\n`, "utf8");

  console.log("EBOS deployment execution runbook generated:");
  console.log(`- local commands count: ${runbook.codexPreApprovalCommands.length}`);
  console.log(`- server commands count: ${runbook.commandsAfterApproval.filter((item) => item.environment === "server").length}`);
  console.log(`- verification commands count: ${runbook.postDeploySmokeTestCommand ? 1 : 0}`);
  console.log(`- rollback commands count: ${runbook.smokeTestFailureRollbackSteps.length}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
