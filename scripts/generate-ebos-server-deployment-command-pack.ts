import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildServerDeploymentCommandPack,
  renderServerDeploymentCommandPackMarkdown,
  writeServerDeploymentResultInputTemplate
} from "@/lib/ebos/deployment-server-intake";
import { readDeploymentExecutionStatus } from "@/lib/ebos/deployment-execution";
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

function hasFlag(name: string) {
  return process.argv.includes(name);
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
  const force = hasFlag("--force");
  const operatorChecklist = await readDeploymentOperatorChecklist({ targetDate });
  if (!operatorChecklist) {
    throw new Error(`Missing deployment operator checklist for ${targetDate}.`);
  }
  const executionStatus = await readDeploymentExecutionStatus({ targetDate });
  if (!executionStatus) {
    throw new Error(`Missing deployment execution status for ${targetDate}.`);
  }

  const resultInputRelativePath = normalizePath(
    `reports/ebos/deployment/execution/command-results/${targetDate}-server-deployment-result.json`
  );
  const pack = buildServerDeploymentCommandPack({
    targetDate,
    currentDeploymentStatus: executionStatus.status.deploymentStatus,
    operatorChecklist: operatorChecklist.report,
    resultInputTemplatePath: resultInputRelativePath
  });
  const outputRoot = resolve(process.cwd(), "reports", "ebos", "deployment", "execution");
  const packJsonPath = resolve(outputRoot, "server-intake", `${targetDate}-server-deployment-command-pack.json`);
  const packMarkdownPath = resolve(outputRoot, "server-intake", `${targetDate}-server-deployment-command-pack.md`);
  const resultInputPath = resolve(process.cwd(), resultInputRelativePath);
  const templateWrite = await writeServerDeploymentResultInputTemplate({
    targetDate,
    filePath: resultInputPath,
    force
  });

  await mkdir(dirname(packJsonPath), { recursive: true });
  await writeFile(packJsonPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  await writeFile(packMarkdownPath, `${renderServerDeploymentCommandPackMarkdown(pack)}\n`, "utf8");

  console.log("EBOS server deployment command pack generated:");
  console.log(`- currentDeploymentStatus: ${pack.currentDeploymentStatus}`);
  console.log(`- manualRequiredCommands: ${pack.manualRequiredCommands.length}`);
  console.log(`- commandGroups: ${pack.commandGroups.length}`);
  console.log(`- command pack JSON: ${packJsonPath}`);
  console.log(`- command pack Markdown: ${packMarkdownPath}`);
  console.log(`- result input path: ${templateWrite.filePath}`);
  console.log(`- result input written: ${templateWrite.written}`);
  if (templateWrite.skippedReason) console.log(`- result input skipped: ${templateWrite.skippedReason}`);
  console.log(`- next command: npx tsx scripts/check-ebos-server-deployment-result-input.ts --date ${targetDate}`);
  console.log("- real deployment executed: no");
  console.log("- server/docker/nginx commands run: no");
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
