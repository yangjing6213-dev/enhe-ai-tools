import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  DEPLOYMENT_APPROVAL_EXPECTED_PHRASE,
  buildApprovalResponseAudit,
  writeDeploymentStatusSafely,
  type EbosDeploymentExecutionStatus
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

function hasFlag(name: string) {
  return process.argv.includes(name);
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
  const response = readArg("--response") ?? "";
  const apply = hasFlag("--apply");
  const statusPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status.json`
  );
  const backupDir = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "backups");
  const beforeStatus = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const audit = buildApprovalResponseAudit(response, DEPLOYMENT_APPROVAL_EXPECTED_PHRASE, { targetDate });
  const result = await writeDeploymentStatusSafely({
    statusPath,
    approvalAudit: audit,
    dryRun: !apply,
    backupDir,
    source: "scripts/approve-ebos-deployment-execution.ts"
  });

  console.log("EBOS deployment execution approval transition:");
  console.log(`- dryRun: ${result.dryRun}`);
  console.log(`- approvalDecision: ${result.approvalDecision}`);
  console.log(`- exactMatch: ${result.exactMatch}`);
  console.log(`- previous deploymentStatus: ${beforeStatus.deploymentStatus}`);
  console.log(`- next deploymentStatus preview: ${result.nextDeploymentStatusPreview}`);
  console.log(`- status written: ${result.written ? "yes" : "no"}`);
  console.log(`- backupPath: ${result.backupPath ?? "none"}`);
  console.log(`- statusPath: ${statusPath}`);
  console.log(`- warnings: ${result.warnings.length}`);
  for (const warning of result.warnings) {
    console.log(`  - ${warning}`);
  }
  console.log("- production commands executed: no");
}

function toDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
