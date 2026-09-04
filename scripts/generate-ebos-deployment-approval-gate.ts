import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildDeploymentApprovalGate,
  buildDeploymentExecutionContract,
  renderDeploymentApprovalGateMarkdown,
  writeDeploymentExecutionStatusTemplate,
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
  const gate = await buildDeploymentApprovalGate({
    targetDate,
    siteUrl,
    deploymentPlanReport
  });
  const contract = buildDeploymentExecutionContract({
    targetDate,
    deploymentPlanReport
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "approvals");
  const jsonPath = resolve(outputDir, `${targetDate}-deployment-approval-gate.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-deployment-approval-gate.md`);
  const statusTemplate = await writeDeploymentExecutionStatusTemplate({ targetDate });

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(gate, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderDeploymentApprovalGateMarkdown(gate, contract)}\n`, "utf8");

  console.log("EBOS deployment approval gate generated:");
  console.log(`- approvalStatus: ${gate.approvalStatus}`);
  console.log(`- deploymentStatus: ${gate.deploymentStatus}`);
  console.log(`- commandsRequiringApproval count: ${gate.commandsRequiringApproval.length}`);
  console.log(`- codexAllowedActions count: ${gate.codexAllowedActions.length}`);
  console.log(`- userRequiredConfirmations count: ${gate.userRequiredConfirmations.length}`);
  console.log(`- status template path: ${statusTemplate.filePath}`);
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
