import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  readDeploymentExecutionStatus,
  renderDeploymentExecutionStatusSummaryMarkdown,
  summarizeDeploymentExecutionStatus
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
  const statusResult = await readDeploymentExecutionStatus({ targetDate });
  if (!statusResult) {
    throw new Error(`Deployment execution status template is missing for ${targetDate}. Generate approval gate first.`);
  }

  const summary = summarizeDeploymentExecutionStatus(statusResult.status);
  const summaryPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status-summary.md`
  );

  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${renderDeploymentExecutionStatusSummaryMarkdown(summary)}\n`, "utf8");

  console.log("EBOS deployment execution status:");
  console.log(`- approvedByUser: ${summary.approvedByUser}`);
  console.log(`- deploymentStatus: ${summary.deploymentStatus}`);
  console.log(`- local commands run count: ${summary.localCommandsRunCount}`);
  console.log(`- server commands run count: ${summary.serverCommandsRunCount}`);
  console.log(`- verification commands run count: ${summary.verificationCommandsRunCount}`);
  console.log(`- warnings: ${summary.warnings.length}`);
  if (!summary.approvedByUser) {
    console.log("- status: awaiting user approval");
  }
  if (summary.deploymentStatus === "deployed_pending_verification") {
    console.log("- next: run post-launch check before marking verified.");
  }
  console.log(`- Summary: ${summaryPath}`);
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
