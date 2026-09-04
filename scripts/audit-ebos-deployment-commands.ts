import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  auditDeploymentCommands,
  renderDeploymentCommandAuditMarkdown
} from "@/lib/ebos/deployment-operator";

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
  const planPath = resolve(process.cwd(), "reports", "ebos", "deployment", `${targetDate}-production-deployment-plan.md`);
  const runbookPath = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "runbooks", `${targetDate}-deployment-execution-runbook.md`);
  const audit = auditDeploymentCommands({
    targetDate,
    deploymentPlanMarkdown: await readOptional(planPath),
    executionRunbookMarkdown: await readOptional(runbookPath)
  });
  const outputDir = resolve(process.cwd(), "reports", "ebos", "deployment", "operator");
  const jsonPath = resolve(outputDir, `${targetDate}-deployment-command-audit.json`);
  const markdownPath = resolve(outputDir, `${targetDate}-deployment-command-audit.md`);

  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderDeploymentCommandAuditMarkdown(audit)}\n`, "utf8");

  console.log("EBOS deployment command audit generated:");
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- Markdown: ${markdownPath}`);
  console.log(`- commandsAudited: ${audit.commandsAudited}`);
  console.log(`- dangerousCommandsDetected: ${audit.dangerousCommandsDetected.length}`);
  console.log(`- migrationCommandsDetected: ${audit.migrationCommandsDetected.length}`);
  console.log(`- secretExposureRisks: ${audit.secretExposureRisks.length}`);
  console.log(`- safeToProceed: ${audit.safeToProceed}`);
  console.log(`- manualRequiredCommands: ${audit.manualRequiredCommands.length}`);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
