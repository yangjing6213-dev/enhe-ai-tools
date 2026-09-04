import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  auditDeploymentCommands,
  buildDeploymentOperatorChecklist,
  renderDeploymentOperatorChecklistMarkdown
} from "@/lib/ebos/deployment-operator";
import { readDeploymentExecutionStatus } from "@/lib/ebos/deployment-execution";

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

async function readOptional(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function main() {
  const targetDate = parseTargetDate();
  const siteUrl = readArg("--site-url") ?? "https://www.enhe-tech.com.cn";
  const planPath = resolve(process.cwd(), "reports", "ebos", "deployment", `${targetDate}-production-deployment-plan.md`);
  const runbookPath = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "runbooks", `${targetDate}-deployment-execution-runbook.md`);
  const status = await readDeploymentExecutionStatus({ targetDate });
  const audit = auditDeploymentCommands({
    targetDate,
    deploymentPlanMarkdown: await readOptional(planPath),
    executionRunbookMarkdown: await readOptional(runbookPath)
  });
  const report = buildDeploymentOperatorChecklist({
    targetDate,
    siteUrl,
    currentDeploymentStatus: status?.status.deploymentStatus ?? "not_started",
    approvedByUser: status?.status.approvedByUser ?? false,
    commandAudit: audit
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "operator");
  const jsonPath = resolve(outputDir, `${targetDate}-deployment-operator-checklist.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-deployment-operator-checklist.md`);

  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderDeploymentOperatorChecklistMarkdown(report)}\n`, "utf8");

  console.log("EBOS deployment operator checklist generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- currentDeploymentStatus: ${report.currentDeploymentStatus}`);
  console.log(`- approvedByUser: ${report.approvedByUser}`);
  console.log(`- safeToProceed: ${report.commandAudit.safeToProceed}`);
  console.log(`- operatorChecklist: ${report.operatorChecklist.length}`);
  console.log(`- executionSteps: ${report.executionSteps.length}`);
  console.log(`- manualRequired: ${report.commandAudit.manualRequiredCommands.length}`);
  console.log("- nextActions:");
  for (const action of report.nextActions) {
    console.log(`  - ${action}`);
  }
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
