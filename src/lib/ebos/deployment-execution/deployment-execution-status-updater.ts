import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { validateManualServerDeploymentResult } from "./deployment-command-result-reader";
import type {
  EbosDeploymentExecutionStatus,
  EbosDeploymentStatus
} from "./deployment-execution-types";
import type {
  EbosDeploymentCommandResult,
  EbosProductionDeploymentStatusTransitionResult,
  EbosManualServerDeploymentResult
} from "./deployment-real-execution-types";

export const productionDeploymentExecutionConfirmationPhrase = "确认执行真实部署命令";

export async function backupStatusBeforeExecution(options: {
  statusPath: string;
  backupDir?: string;
  timestamp?: string;
}) {
  const current = await readStatus(options.statusPath);
  const timestamp = (options.timestamp ?? new Date().toISOString()).replace(/[:.]/g, "-");
  const targetDir = options.backupDir ?? join(dirname(dirname(options.statusPath)), "backups");
  const backupPath = join(
    targetDir,
    `${current.targetDate}-deployment-execution-status.before-execution.${timestamp}.json`
  ).replace(/\\/g, "/");

  await mkdir(targetDir, { recursive: true });
  await copyFile(options.statusPath, backupPath);
  return backupPath;
}

export async function updateStatusToExecuting(options: {
  statusPath: string;
  confirmationPhrase: string;
  now?: string;
  backupDir?: string;
}): Promise<EbosProductionDeploymentStatusTransitionResult> {
  const current = await readStatus(options.statusPath);
  const warnings: string[] = [];
  const now = options.now ?? new Date().toISOString();

  if (options.confirmationPhrase !== productionDeploymentExecutionConfirmationPhrase) {
    warnings.push("confirmation phrase does not match required production deployment execution phrase.");
  }
  if (current.deploymentStatus !== "approved_not_executed") {
    warnings.push(`current deploymentStatus must be approved_not_executed, got ${current.deploymentStatus}.`);
  }
  if (!current.approvedByUser) {
    warnings.push("approvedByUser must be true before execution can start.");
  }
  if (warnings.length > 0) {
    return transition(current.deploymentStatus, current.deploymentStatus, false, "Execution start rejected.", warnings);
  }

  const backupPath = await backupStatusBeforeExecution({
    statusPath: options.statusPath,
    backupDir: options.backupDir,
    timestamp: now
  });
  const nextStatus: EbosDeploymentExecutionStatus = {
    ...current,
    updatedAt: now,
    deploymentStatus: "executing",
    notes: [
      ...current.notes,
      "Production deployment execution entered executing state after exact second confirmation. Server/Docker/Nginx commands are still manual_required."
    ]
  };
  await writeStatus(options.statusPath, nextStatus);

  return {
    ...transition(current.deploymentStatus, "executing", true, "Execution started after exact confirmation.", []),
    backupPath
  };
}

export async function updateStatusAfterLocalCommands(options: {
  statusPath: string;
  localCommandResults: EbosDeploymentCommandResult[];
  now?: string;
  backupDir?: string;
}): Promise<EbosProductionDeploymentStatusTransitionResult> {
  const current = await readStatus(options.statusPath);
  const warnings: string[] = [];
  const now = options.now ?? new Date().toISOString();

  if (current.deploymentStatus !== "executing") {
    warnings.push(`current deploymentStatus must be executing, got ${current.deploymentStatus}.`);
    return transition(current.deploymentStatus, current.deploymentStatus, false, "Local command status update rejected.", warnings);
  }

  const failed = options.localCommandResults.filter((result) => result.status === "failed");
  const nextDeploymentStatus: EbosDeploymentStatus = failed.length > 0 ? "failed" : "executing";
  const backupPath = await backupStatusBeforeExecution({
    statusPath: options.statusPath,
    backupDir: options.backupDir,
    timestamp: now
  });
  const nextStatus: EbosDeploymentExecutionStatus = {
    ...current,
    updatedAt: now,
    deploymentStatus: nextDeploymentStatus,
    localCommandsRun: options.localCommandResults.map((result) => result.command),
    notes: [
      ...current.notes,
      failed.length > 0
        ? `Local pre-deployment command failed: ${failed.map((result) => result.command).join("; ")}.`
        : "Local pre-deployment commands passed. Waiting for manual server deployment result."
    ],
    warnings: failed.length > 0
      ? [...current.warnings, "Local command failure blocked production deployment execution."]
      : current.warnings
  };

  await writeStatus(options.statusPath, nextStatus);

  return {
    ...transition(
      current.deploymentStatus,
      nextDeploymentStatus,
      true,
      failed.length > 0 ? "Local command failure moved status to failed." : "Local commands passed; status remains executing.",
      []
    ),
    backupPath
  };
}

export async function updateStatusAfterManualServerResult(options: {
  statusPath: string;
  manualResult: EbosManualServerDeploymentResult;
  now?: string;
  backupDir?: string;
}): Promise<EbosProductionDeploymentStatusTransitionResult> {
  const current = await readStatus(options.statusPath);
  const warnings: string[] = [];
  const now = options.now ?? new Date().toISOString();

  if (current.deploymentStatus !== "executing") {
    warnings.push(`current deploymentStatus must be executing, got ${current.deploymentStatus}.`);
  }

  const validation = validateManualServerDeploymentResult(options.manualResult);
  warnings.push(...validation.warnings);
  if (!validation.valid || !validation.complete) {
    warnings.push(...validation.blockers);
    return transition(current.deploymentStatus, current.deploymentStatus, false, "Manual server result is incomplete; status remains executing.", warnings);
  }

  if (warnings.length > 0 && current.deploymentStatus !== "executing") {
    return transition(current.deploymentStatus, current.deploymentStatus, false, "Manual server result update rejected.", warnings);
  }

  const backupPath = await backupStatusBeforeExecution({
    statusPath: options.statusPath,
    backupDir: options.backupDir,
    timestamp: now
  });
  const nextStatus: EbosDeploymentExecutionStatus = {
    ...current,
    updatedAt: now,
    deploymentStatus: "deployed_pending_verification",
    deployedAt: options.manualResult.deployedAt ?? now,
    serverCommandsRun: ["manual server deployment commands completed"],
    dockerCommandsRun: ["manual Docker/Nginx deployment commands completed"],
    postLaunchCheckStatus: "not_run",
    notes: [
      ...current.notes,
      "Manual server, Docker, and Nginx deployment result recorded as complete. Post-launch check is still required before verified."
    ]
  };
  await writeStatus(options.statusPath, nextStatus);

  return {
    ...transition(current.deploymentStatus, "deployed_pending_verification", true, "Manual server result complete; post-launch verification required.", warnings),
    backupPath
  };
}

function transition(
  previousStatus: EbosDeploymentStatus,
  nextStatus: EbosDeploymentStatus,
  updated: boolean,
  reason: string,
  warnings: string[]
): EbosProductionDeploymentStatusTransitionResult {
  return {
    previousStatus,
    nextStatus,
    updated,
    reason,
    warnings,
    forbiddenStatuses: ["verified"]
  };
}

async function readStatus(statusPath: string) {
  return JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;
}

async function writeStatus(statusPath: string, status: EbosDeploymentExecutionStatus) {
  await mkdir(dirname(statusPath), { recursive: true });
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}
