import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EbosDeploymentExecutionStatus } from "../deployment-execution";
import type {
  EbosCanVerifyDeploymentOptions,
  EbosPostLaunchStatusTransition,
  EbosVerifyDeploymentOptions
} from "./post-launch-types";

export function canVerifyDeployment(options: EbosCanVerifyDeploymentOptions) {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (options.currentStatus.deploymentStatus !== "deployed_pending_verification") {
    blockers.push(`current deploymentStatus must be deployed_pending_verification, got ${options.currentStatus.deploymentStatus}.`);
  }
  if (options.report.overallStatus !== "passed") {
    blockers.push(`post-launch overallStatus must be passed, got ${options.report.overallStatus}.`);
  }
  if (!options.report.canTransitionToVerified) {
    blockers.push("post-launch report canTransitionToVerified is false.");
  }
  if (options.report.blockers.length > 0) {
    blockers.push(...options.report.blockers);
  }
  warnings.push(...options.report.warnings);

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings
  };
}

export async function transitionDeploymentStatusToVerified(
  options: EbosVerifyDeploymentOptions
): Promise<EbosPostLaunchStatusTransition> {
  const currentStatus = JSON.parse(await readFile(options.statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const verification = canVerifyDeployment({
    currentStatus,
    report: options.report
  });
  const now = options.now ?? new Date().toISOString();

  if (!verification.allowed) {
    return {
      previousStatus: currentStatus.deploymentStatus,
      nextStatus: currentStatus.deploymentStatus,
      updated: false,
      reason: `Verification rejected: ${verification.blockers.join("; ")}`,
      warnings: verification.warnings
    };
  }

  const backupPath = await backupDeploymentStatusBeforeVerification({
    statusPath: options.statusPath,
    backupDir: options.backupDir,
    timestamp: now
  });
  const nextStatus: EbosDeploymentExecutionStatus = {
    ...currentStatus,
    updatedAt: now,
    deploymentStatus: "verified",
    postLaunchCheckStatus: "passed",
    verifiedAt: now,
    verificationCommandsRun: appendUnique(currentStatus.verificationCommandsRun, options.verificationCommand),
    notes: [
      ...currentStatus.notes,
      "Post-launch live check passed; deployment status moved to verified."
    ]
  };

  await writeFile(options.statusPath, `${JSON.stringify(nextStatus, null, 2)}\n`, "utf8");

  return {
    previousStatus: currentStatus.deploymentStatus,
    nextStatus: "verified",
    updated: true,
    backupPath,
    reason: "Post-launch live check passed; status updated to verified.",
    warnings: verification.warnings
  };
}

export async function backupDeploymentStatusBeforeVerification(options: {
  statusPath: string;
  backupDir?: string;
  timestamp?: string;
}) {
  const current = JSON.parse(await readFile(options.statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const timestamp = (options.timestamp ?? new Date().toISOString()).replace(/[:.]/g, "-");
  const targetDir = options.backupDir ?? join(dirname(dirname(options.statusPath)), "backups");
  const backupPath = join(
    targetDir,
    `${current.targetDate}-deployment-execution-status.before-verification.${timestamp}.json`
  ).replace(/\\/g, "/");

  await mkdir(targetDir, { recursive: true });
  await copyFile(options.statusPath, backupPath);
  return backupPath;
}

function appendUnique(values: string[], value: string) {
  return Array.from(new Set([...values, value]));
}
