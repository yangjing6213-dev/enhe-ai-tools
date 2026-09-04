import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { EbosDeploymentApprovalResponseAudit } from "./deployment-approval-response-parser";
import type {
  EbosDeploymentExecutionStatus,
  EbosDeploymentStatus
} from "./deployment-execution-types";

export type EbosDeploymentStatusTransitionResult = {
  dryRun: boolean;
  allowed: boolean;
  written: boolean;
  approvalDecision: EbosDeploymentApprovalResponseAudit["approvalDecision"];
  exactMatch: boolean;
  previousDeploymentStatus: EbosDeploymentStatus;
  nextDeploymentStatusPreview: EbosDeploymentStatus;
  nextStatus?: EbosDeploymentExecutionStatus;
  statusPath?: string;
  backupPath?: string;
  warnings: string[];
};

export function buildApprovedNotExecutedStatus(options: {
  currentStatus: EbosDeploymentExecutionStatus;
  approvedAt?: string;
  source?: string;
}): EbosDeploymentExecutionStatus {
  const approvedAt = options.approvedAt ?? new Date().toISOString();
  const source = options.source ?? "approval response parser";

  return {
    ...options.currentStatus,
    updatedAt: approvedAt,
    approvedByUser: true,
    approvedAt,
    deploymentStatus: "approved_not_executed",
    notes: [
      ...options.currentStatus.notes,
      `Approval phrase accepted from ${source}; status moved to approved_not_executed. Production is not deployed.`
    ]
  };
}

export function transitionDeploymentStatus(options: {
  currentStatus: EbosDeploymentExecutionStatus;
  approvalAudit: EbosDeploymentApprovalResponseAudit;
  apply?: boolean;
  requestedDeploymentStatus?: EbosDeploymentStatus;
  now?: string;
  source?: string;
}): EbosDeploymentStatusTransitionResult {
  const dryRun = options.apply !== true;
  const warnings: string[] = [];
  const requestedDeploymentStatus = options.requestedDeploymentStatus ?? "approved_not_executed";

  if (options.approvalAudit.approvalDecision !== "approved" || !options.approvalAudit.exactMatch) {
    warnings.push("approval response is not approved by exact phrase.");
  }
  if (requestedDeploymentStatus !== "approved_not_executed") {
    warnings.push("direct transition to executing, deployed_pending_verification, or verified is not allowed by approval parser.");
  }
  if (options.currentStatus.deploymentStatus !== "awaiting_approval") {
    warnings.push(`current deploymentStatus must be awaiting_approval, got ${options.currentStatus.deploymentStatus}.`);
  }
  if (options.currentStatus.approvedByUser) {
    warnings.push("current status is already approved by user.");
  }

  const allowed = warnings.length === 0;
  const nextStatus = allowed
    ? buildApprovedNotExecutedStatus({
        currentStatus: options.currentStatus,
        approvedAt: options.now,
        source: options.source
      })
    : undefined;

  return {
    dryRun,
    allowed,
    written: false,
    approvalDecision: options.approvalAudit.approvalDecision,
    exactMatch: options.approvalAudit.exactMatch,
    previousDeploymentStatus: options.currentStatus.deploymentStatus,
    nextDeploymentStatusPreview: nextStatus?.deploymentStatus ?? options.currentStatus.deploymentStatus,
    ...(nextStatus ? { nextStatus } : {}),
    warnings
  };
}

export async function backupDeploymentExecutionStatus(
  statusPath: string,
  backupDir?: string,
  timestamp = new Date().toISOString()
) {
  const current = JSON.parse(await readFile(statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const targetDir = backupDir ?? join(dirname(dirname(statusPath)), "backups");
  const backupPath = join(
    targetDir,
    `${current.targetDate}-deployment-execution-status.before-approval.${safeTimestamp}.json`
  ).replace(/\\/g, "/");

  await mkdir(targetDir, { recursive: true });
  await copyFile(statusPath, backupPath);
  return backupPath;
}

export async function writeDeploymentStatusSafely(options: {
  statusPath: string;
  approvalAudit: EbosDeploymentApprovalResponseAudit;
  dryRun?: boolean;
  backupDir?: string;
  now?: string;
  source?: string;
  requestedDeploymentStatus?: EbosDeploymentStatus;
}): Promise<EbosDeploymentStatusTransitionResult> {
  const currentStatus = JSON.parse(await readFile(options.statusPath, "utf8")) as EbosDeploymentExecutionStatus;
  const apply = options.dryRun === true ? false : options.dryRun === false;
  const transition = transitionDeploymentStatus({
    currentStatus,
    approvalAudit: options.approvalAudit,
    apply,
    requestedDeploymentStatus: options.requestedDeploymentStatus,
    now: options.now,
    source: options.source
  });
  const base = {
    ...transition,
    statusPath: options.statusPath
  };

  if (!transition.allowed || transition.dryRun || !transition.nextStatus) {
    return base;
  }

  const backupPath = await backupDeploymentExecutionStatus(options.statusPath, options.backupDir, options.now);
  await writeFile(options.statusPath, `${JSON.stringify(transition.nextStatus, null, 2)}\n`, "utf8");

  return {
    ...base,
    written: true,
    backupPath
  };
}
