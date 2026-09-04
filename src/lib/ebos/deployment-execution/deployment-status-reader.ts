import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createExecutionStatusTemplate } from "./deployment-execution-contract";
import type {
  EbosDeploymentExecutionStatus,
  EbosDeploymentExecutionStatusSummary
} from "./deployment-execution-types";

export async function readDeploymentExecutionStatus(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<{ filePath: string; status: EbosDeploymentExecutionStatus } | null> {
  const filePath = getDeploymentExecutionStatusPath(options);
  try {
    const status = JSON.parse(await readFile(filePath, "utf8")) as EbosDeploymentExecutionStatus;
    return status.statusType === "production_deployment_execution_status"
      ? { filePath, status }
      : null;
  } catch {
    return null;
  }
}

export async function readLatestDeploymentExecutionStatus(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; status: EbosDeploymentExecutionStatus } | null> {
  if (options.targetDate) {
    return readDeploymentExecutionStatus({
      targetDate: options.targetDate,
      reportsRoot: options.reportsRoot
    });
  }

  const directory = join(options.reportsRoot ?? "reports/ebos", "deployment", "execution", "status").replace(/\\/g, "/");
  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-deployment-execution-status.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const status = JSON.parse(await readFile(filePath, "utf8")) as EbosDeploymentExecutionStatus;
    return status.statusType === "production_deployment_execution_status" ? { filePath, status } : null;
  } catch {
    return null;
  }
}

export async function writeDeploymentExecutionStatusTemplate(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<{ filePath: string; status: EbosDeploymentExecutionStatus; created: boolean }> {
  const filePath = getDeploymentExecutionStatusPath(options);
  const existing = await readDeploymentExecutionStatus(options);
  if (existing) {
    return { ...existing, created: false };
  }

  const status = createExecutionStatusTemplate(options.targetDate, "awaiting_approval");
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return { filePath, status, created: true };
}

export function summarizeDeploymentExecutionStatus(
  status: EbosDeploymentExecutionStatus
): EbosDeploymentExecutionStatusSummary {
  const warnings = [...status.warnings];
  if (status.deploymentStatus === "deployed_pending_verification" && status.verificationCommandsRun.length === 0) {
    warnings.push("Deployment is pending verification; run post-launch check before using verified status.");
  }
  if (status.deploymentStatus === "verified" && status.postLaunchCheckStatus !== "passed") {
    warnings.push("Status is verified but postLaunchCheckStatus is not passed; review execution record.");
  }

  return {
    targetDate: status.targetDate,
    approvedByUser: status.approvedByUser,
    deploymentStatus: status.deploymentStatus,
    localCommandsRunCount: status.localCommandsRun.length,
    serverCommandsRunCount: status.serverCommandsRun.length,
    dockerCommandsRunCount: status.dockerCommandsRun.length,
    verificationCommandsRunCount: status.verificationCommandsRun.length,
    postLaunchCheckStatus: status.postLaunchCheckStatus,
    warnings,
    statusMessage: buildStatusMessage(status)
  };
}

export function renderDeploymentExecutionStatusSummaryMarkdown(summary: EbosDeploymentExecutionStatusSummary) {
  return [
    "# ENHE Deployment Execution Status Summary",
    "",
    `- targetDate: ${summary.targetDate}`,
    `- approvedByUser: ${summary.approvedByUser}`,
    `- deploymentStatus: ${summary.deploymentStatus}`,
    `- local commands run: ${summary.localCommandsRunCount}`,
    `- server commands run: ${summary.serverCommandsRunCount}`,
    `- docker commands run: ${summary.dockerCommandsRunCount}`,
    `- verification commands run: ${summary.verificationCommandsRunCount}`,
    `- postLaunchCheckStatus: ${summary.postLaunchCheckStatus}`,
    `- statusMessage: ${summary.statusMessage}`,
    "",
    "## Warnings",
    list(summary.warnings)
  ].join("\n");
}

function buildStatusMessage(status: EbosDeploymentExecutionStatus) {
  if (!status.approvedByUser) return "awaiting user approval";
  if (status.deploymentStatus === "deployed_pending_verification") return "post-launch verification required";
  if (status.deploymentStatus === "verified") return "deployment verified by recorded post-launch check";
  return status.deploymentStatus;
}

function getDeploymentExecutionStatusPath(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}) {
  const targetDate = toDateKey(options.targetDate);
  return join(
    options.reportsRoot ?? "reports/ebos",
    "deployment",
    "execution",
    "status",
    `${targetDate}-deployment-execution-status.json`
  ).replace(/\\/g, "/");
}

function list(items: string[] = []) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
