import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EbosDeploymentOperatorChecklistReport } from "../deployment-operator";
import { renderProductionDeploymentExecutionMarkdown } from "./deployment-real-execution-markdown";
import type { EbosDeploymentExecutionStatus } from "./deployment-execution-types";
import {
  updateStatusAfterLocalCommands,
  updateStatusToExecuting
} from "./deployment-execution-status-updater";
import type {
  EbosDeploymentCommandResult,
  EbosProductionDeploymentStatusTransitionResult,
  EbosProductionDeploymentExecutionReport
} from "./deployment-real-execution-types";

export type EbosLocalCommandExecutor = (command: string) => Promise<{
  exitCode: number;
  summary: string;
  evidence?: string[];
}>;

const localPreDeploymentCommands = [
  "npm run lint",
  "npm run typecheck",
  "npm run build"
];

export async function startProductionDeploymentExecution(options: {
  targetDate: string | Date;
  statusPath: string;
  outputRoot: string;
  confirmationPhrase: string;
  operatorChecklist: EbosDeploymentOperatorChecklistReport;
  commandExecutor?: EbosLocalCommandExecutor;
  now?: string;
  siteUrl?: string;
}): Promise<EbosProductionDeploymentExecutionReport> {
  const targetDate = toDateKey(options.targetDate);
  const transition = await updateStatusToExecuting({
    statusPath: options.statusPath,
    confirmationPhrase: options.confirmationPhrase,
    now: options.now
  });
  const manualServerCommandResults = buildManualServerCommandPackage({
    operatorChecklist: options.operatorChecklist
  });
  let localCommandResults: EbosDeploymentCommandResult[] = [];

  if (transition.updated) {
    localCommandResults = await runLocalPreDeploymentCommands({
      targetDate,
      commandExecutor: options.commandExecutor
    });
    await writeJson(
      join(options.outputRoot, "command-results", `${targetDate}-local-command-results.json`),
      localCommandResults
    );
    await writeJson(
      join(options.outputRoot, "command-results", `${targetDate}-manual-server-command-package.json`),
      manualServerCommandResults
    );
    const localTransition = await updateStatusAfterLocalCommands({
      statusPath: options.statusPath,
      localCommandResults,
      now: options.now
    });
    transition.nextStatus = localTransition.nextStatus;
    transition.reason = localTransition.reason;
    transition.warnings = [...transition.warnings, ...localTransition.warnings];
  }

  const executionStatus = JSON.parse(await readFile(options.statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const report = summarizeExecutionProgress({
    targetDate,
    executionStatus,
    localCommandResults,
    manualServerCommandResults,
    statusTransition: transition,
    siteUrl: options.siteUrl ?? "https://www.enhe-tech.com.cn"
  });
  const reportPath = join(options.outputRoot, "live", `${targetDate}-production-deployment-execution-report.json`);
  const markdownPath = join(options.outputRoot, "live", `${targetDate}-production-deployment-execution-report.md`);

  await writeJson(reportPath, report);
  await writeText(markdownPath, renderProductionDeploymentExecutionMarkdown(report));

  return report;
}

export async function runLocalPreDeploymentCommands(options: {
  targetDate: string | Date;
  commandExecutor?: EbosLocalCommandExecutor;
}): Promise<EbosDeploymentCommandResult[]> {
  const executor = options.commandExecutor ?? executeLocalCommand;
  const results: EbosDeploymentCommandResult[] = [];

  for (const [index, command] of localPreDeploymentCommands.entries()) {
    const startedAt = new Date().toISOString();
    try {
      const result = await executor(command);
      const completedAt = new Date().toISOString();
      results.push({
        id: `local-${index + 1}`,
        command,
        environment: "local",
        status: result.exitCode === 0 ? "success" : "failed",
        exitCode: result.exitCode,
        startedAt,
        completedAt,
        summary: result.summary,
        evidence: result.evidence,
        warnings: result.exitCode === 0 ? [] : [`${command} exited with ${result.exitCode}.`]
      });
    } catch (error) {
      results.push({
        id: `local-${index + 1}`,
        command,
        environment: "local",
        status: "failed",
        exitCode: 1,
        startedAt,
        completedAt: new Date().toISOString(),
        summary: error instanceof Error ? error.message : String(error),
        warnings: [`${command} threw before completion.`]
      });
    }
  }

  return results;
}

export function buildManualServerCommandPackage(options: {
  operatorChecklist: EbosDeploymentOperatorChecklistReport;
}): EbosDeploymentCommandResult[] {
  return options.operatorChecklist.operatorChecklist
    .filter((item) => ["server_deploy", "docker_restart", "nginx_reload"].includes(item.phase))
    .map((item, index): EbosDeploymentCommandResult => ({
      id: item.id || `manual-${index + 1}`,
      command: item.command ?? item.title,
      environment: item.phase === "docker_restart" ? "docker" : item.phase === "nginx_reload" ? "nginx" : "server",
      status: "manual_required",
      summary: "Must be executed by the user in the server context or after explicit executable environment confirmation.",
      evidence: [item.evidence],
      warnings: ["Codex did not execute this command."]
    }));
}

export function summarizeExecutionProgress(options: {
  targetDate: string | Date;
  executionStatus: EbosDeploymentExecutionStatus;
  localCommandResults: EbosDeploymentCommandResult[];
  manualServerCommandResults: EbosDeploymentCommandResult[];
  statusTransition: EbosProductionDeploymentStatusTransitionResult;
  siteUrl: string;
}): EbosProductionDeploymentExecutionReport {
  const targetDate = toDateKey(options.targetDate);
  const serverCommandResults = options.manualServerCommandResults.filter((result) => result.environment === "server");
  const dockerCommandResults = options.manualServerCommandResults.filter((result) => result.environment === "docker");
  const nginxCommandResults = options.manualServerCommandResults.filter((result) => result.environment === "nginx");
  const localFailures = options.localCommandResults.filter((result) => result.status === "failed");
  const manualRequiredCount = options.manualServerCommandResults.filter((result) => result.status === "manual_required").length;
  const blockers = [
    ...localFailures.map((result) => `Local command failed: ${result.command}`),
    ...(manualRequiredCount > 0 && options.executionStatus.deploymentStatus === "executing"
      ? [`${manualRequiredCount} server/Docker/Nginx commands still require manual result input.`]
      : [])
  ];
  const postLaunchCommand = `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${options.siteUrl.replace(/\/+$/, "")}`;
  const postLaunchCheckAllowed = options.executionStatus.deploymentStatus === "deployed_pending_verification";

  return {
    reportType: "production_deployment_execution",
    targetDate,
    generatedAt: new Date().toISOString(),
    executionStatus: options.executionStatus,
    localCommandResults: options.localCommandResults,
    serverCommandResults,
    dockerCommandResults,
    nginxCommandResults,
    verificationReadiness: {
      postLaunchCheckAllowed,
      reason: postLaunchCheckAllowed
        ? "Manual server deployment result is complete; post-launch check can run."
        : "Waiting for complete manual server deployment result before post-launch check.",
      command: postLaunchCommand
    },
    statusTransition: options.statusTransition,
    blockers,
    warnings: [
      ...options.executionStatus.warnings,
      ...options.statusTransition.warnings
    ],
    nextActions: postLaunchCheckAllowed
      ? ["Run post-launch check before marking deployment verified."]
      : ["Wait for manual server deployment result before running post-launch check."]
  };
}

function executeLocalCommand(command: string): Promise<{ exitCode: number; summary: string; evidence?: string[] }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(-2000);
      resolve({
        exitCode: code ?? 1,
        summary: output || `${command} exited with ${code ?? 1}.`,
        evidence: output ? [output] : undefined
      });
    });
  });
}

async function writeJson(filePath: string, value: unknown) {
  await writeText(filePath, JSON.stringify(value, null, 2));
}

async function writeText(filePath: string, value: string) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${value}\n`, "utf8");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
