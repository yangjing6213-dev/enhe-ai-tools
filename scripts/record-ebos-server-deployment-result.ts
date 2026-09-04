import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  readManualServerDeploymentResult,
  renderProductionDeploymentExecutionMarkdown,
  summarizeExecutionProgress,
  updateStatusAfterManualServerResult,
  type EbosDeploymentExecutionStatus,
  type EbosProductionDeploymentStatusTransitionResult
} from "@/lib/ebos/deployment-execution";
import {
  validateServerDeploymentResultInput
} from "@/lib/ebos/deployment-server-intake";

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
  const input = readArg("--input");
  if (!input) throw new Error("Missing --input path.");

  const statusPath = resolve(
    process.cwd(),
    "reports",
    "ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status.json`
  );
  const inputPath = resolve(process.cwd(), input);
  const rawInput = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const serverResultInputValidation = isServerDeploymentResultInput(rawInput)
    ? validateServerDeploymentResultInput(rawInput)
    : null;
  if (serverResultInputValidation && !serverResultInputValidation.valid) {
    throw new Error(`Invalid server deployment result input: ${serverResultInputValidation.blockers.join("; ")}`);
  }

  const manual = await readManualServerDeploymentResult(inputPath);
  const currentStatus = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const transition = serverResultInputValidation
    && !serverResultInputValidation.canTransitionToDeployedPendingVerification
    ? ({
        previousStatus: currentStatus.deploymentStatus,
        nextStatus: currentStatus.deploymentStatus,
        updated: false,
        reason: "Server deployment result input is not transition-ready; status remains executing.",
        warnings: [
          ...serverResultInputValidation.warnings,
          ...serverResultInputValidation.blockers
        ],
        forbiddenStatuses: ["verified"]
      } satisfies EbosProductionDeploymentStatusTransitionResult)
    : await updateStatusAfterManualServerResult({
        statusPath,
        manualResult: manual.result
      });
  const status = JSON.parse(await readFile(statusPath, "utf8"));
  const report = summarizeExecutionProgress({
    targetDate,
    executionStatus: status,
    localCommandResults: [],
    manualServerCommandResults: [],
    statusTransition: transition,
    siteUrl: "https://www.enhe-tech.com.cn"
  });
  const outputRoot = resolve(process.cwd(), "reports", "ebos", "deployment", "execution", "live");
  const jsonPath = resolve(outputRoot, `${targetDate}-production-deployment-execution-report.json`);
  const markdownPath = resolve(outputRoot, `${targetDate}-production-deployment-execution-report.md`);

  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, `${renderProductionDeploymentExecutionMarkdown(report)}\n`, "utf8");

  console.log("EBOS server deployment result recorded:");
  console.log(`- input: ${input}`);
  console.log(`- inputType: ${serverResultInputValidation ? "server_deployment_result_input" : "manual_server_deployment_result"}`);
  console.log(`- complete: ${manual.validation.complete}`);
  console.log(`- canTransitionToDeployedPendingVerification: ${serverResultInputValidation?.canTransitionToDeployedPendingVerification ?? manual.validation.complete}`);
  console.log(`- previousStatus: ${transition.previousStatus}`);
  console.log(`- nextStatus: ${transition.nextStatus}`);
  console.log(`- updated: ${transition.updated}`);
  console.log(`- warnings: ${(serverResultInputValidation?.warnings.length ?? manual.validation.warnings.length)}`);
  console.log(`- blockers: ${(serverResultInputValidation?.blockers.length ?? manual.validation.blockers.length)}`);
  console.log(`- report JSON: ${jsonPath}`);
  console.log(`- report Markdown: ${markdownPath}`);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isServerDeploymentResultInput(input: unknown) {
  return Boolean(input)
    && typeof input === "object"
    && (input as { inputType?: unknown }).inputType === "server_deployment_result_input";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
