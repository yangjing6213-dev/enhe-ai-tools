import { resolve } from "node:path";
import {
  readDeploymentOperatorChecklist
} from "@/lib/ebos/deployment-operator";
import {
  productionDeploymentExecutionConfirmationPhrase,
  startProductionDeploymentExecution
} from "@/lib/ebos/deployment-execution";

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
  const response = readArg("--response") ?? "";
  if (response !== productionDeploymentExecutionConfirmationPhrase) {
    throw new Error(`Confirmation phrase mismatch. Expected: ${productionDeploymentExecutionConfirmationPhrase}`);
  }

  const statusPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status.json`
  );
  const outputRoot = resolve(process.cwd(), "reports", "ebos", "deployment", "execution");
  const operatorChecklist = await readDeploymentOperatorChecklist({ targetDate });
  if (!operatorChecklist?.report) {
    throw new Error(`Deployment operator checklist missing for ${targetDate}.`);
  }

  const report = await startProductionDeploymentExecution({
    targetDate,
    statusPath,
    outputRoot,
    confirmationPhrase: response,
    operatorChecklist: operatorChecklist.report
  });

  console.log("EBOS production deployment execution started:");
  console.log(`- previousStatus: ${report.statusTransition.previousStatus}`);
  console.log(`- nextStatus: ${report.executionStatus.deploymentStatus}`);
  console.log(`- localCommandResults: ${report.localCommandResults.map((item) => `${item.command}:${item.status}`).join(", ")}`);
  console.log(`- manual server commands required: ${
    report.serverCommandResults.length + report.dockerCommandResults.length + report.nginxCommandResults.length
  }`);
  console.log(`- report JSON: ${resolve(outputRoot, "live", `${targetDate}-production-deployment-execution-report.json`)}`);
  console.log(`- report Markdown: ${resolve(outputRoot, "live", `${targetDate}-production-deployment-execution-report.md`)}`);
  console.log("- server/docker/nginx executed by Codex: no");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
