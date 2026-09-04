import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  EbosProductionDeploymentPlanReport,
  EbosProductionDeploymentPreflightReport
} from "../deployment";
import type {
  EbosDeploymentApprovalChecklistItem,
  EbosDeploymentApprovalGate,
  EbosDeploymentCommandApproval
} from "./deployment-execution-types";

export async function buildDeploymentApprovalGate(options: {
  targetDate: string | Date;
  siteUrl: string;
  reportsRoot?: string;
  preflightReportPath?: string;
  deploymentPlanPath?: string;
  preflightReport?: EbosProductionDeploymentPreflightReport;
  deploymentPlanReport?: EbosProductionDeploymentPlanReport;
}): Promise<EbosDeploymentApprovalGate> {
  const targetDate = toDateKey(options.targetDate);
  const reportsRoot = options.reportsRoot ?? "reports/ebos";
  const preflightReportPath = options.preflightReportPath ?? join(reportsRoot, "deployment", `${targetDate}-production-deployment-preflight.json`).replace(/\\/g, "/");
  const deploymentPlanPath = options.deploymentPlanPath ?? join(reportsRoot, "deployment", `${targetDate}-production-deployment-plan.json`).replace(/\\/g, "/");
  const preflight = options.preflightReport ?? await readJsonFile<EbosProductionDeploymentPreflightReport>(preflightReportPath);
  const deploymentPlan = options.deploymentPlanReport ?? await readJsonFile<EbosProductionDeploymentPlanReport>(deploymentPlanPath);

  return {
    gateType: "production_deployment_approval_gate",
    targetDate,
    generatedAt: new Date().toISOString(),
    preflightReportPath,
    deploymentPlanPath,
    siteUrl: normalizeSiteUrl(options.siteUrl),
    deploymentScope: [
      "Validation page deployment for /validation/ai-prompt-kit and /en/validation/ai-prompt-kit",
      "EBOS deployment reports, scripts, approval gate, runbook, and status evidence",
      "No Prisma migration and no /admin/ebos UI are included in this approval gate"
    ],
    approvalStatus: "awaiting_user_approval",
    deploymentStatus: "awaiting_approval",
    approvalChecklist: buildApprovalChecklist(preflight, deploymentPlan),
    commandsRequiringApproval: buildCommandsRequiringApproval(deploymentPlan),
    codexAllowedActions: [
      "Run local read-only checks.",
      "Run local lint, typecheck, test, and build commands.",
      "Generate EBOS local reports, approval files, runbooks, and status templates.",
      "Read non-sensitive config key names and public report artifacts."
    ],
    userRequiredConfirmations: [
      "Before any production deployment command, the user must reply exactly: 确认部署验证页",
      "The user must confirm server path, deployment method, and rollback readiness.",
      "The user must confirm post-launch smoke tests can run against the public site."
    ],
    riskAcknowledgements: buildRiskAcknowledgements(preflight, deploymentPlan),
    rollbackSummary: deploymentPlan.rollbackPlan.rollbackStrategy,
    warnings: [
      ...preflight.warnings,
      ...deploymentPlan.warnings,
      "approvalStatus is awaiting_user_approval; this report is not approval and is not deployment."
    ]
  };
}

export function buildApprovalChecklist(
  preflight: EbosProductionDeploymentPreflightReport,
  deploymentPlan: EbosProductionDeploymentPlanReport
): EbosDeploymentApprovalChecklistItem[] {
  return [
    checklist("quality-passed", "Confirmed local build/lint/typecheck/test passed", `Preflight readinessStatus=${preflight.readinessStatus}; readinessScore=${preflight.readinessScore}.`),
    checklist("scope-confirmed", "Confirmed deployment scope is only validation pages and EBOS reports/scripts", deploymentPlan.deploymentPlan.notes.join(" ") || "Deployment plan is scoped."),
    checklist("no-prisma-migration", "Confirmed no Prisma migration", "No Prisma migration is part of this deployment approval gate."),
    checklist("no-admin-ebos-ui", "Confirmed no /admin/ebos UI", "This step does not build or modify /admin/ebos UI."),
    checklist("no-secret-print", "Confirmed production env secret will not be printed", "Only key names may be checked; secret values must not be printed."),
    checklist("server-commands-confirmed", "Confirmed server commands need explicit confirmation", "Server, Docker, and Nginx commands require user confirmation before execution."),
    checklist("rollback-exists", "Confirmed rollback plan exists", deploymentPlan.rollbackPlan.rollbackStrategy)
  ];
}

export function buildCommandsRequiringApproval(
  deploymentPlan: EbosProductionDeploymentPlanReport
): EbosDeploymentCommandApproval[] {
  return [
    ...deploymentPlan.deploymentPlan.serverCommands.map((item): EbosDeploymentCommandApproval => ({
      id: item.id,
      command: item.command ?? `${item.title}: ${item.notes}`,
      environment: "server",
      riskLevel: "high",
      requiresUserApproval: true,
      canCodexRunLocally: false,
      mustBeRunOnServer: true,
      description: item.notes || item.title,
      rollbackNote: "Confirm rollback path before server command execution."
    })),
    ...deploymentPlan.deploymentPlan.dockerCommands.map((item): EbosDeploymentCommandApproval => ({
      id: item.id,
      command: item.command ?? `${item.title}: ${item.notes}`,
      environment: "docker",
      riskLevel: "high",
      requiresUserApproval: true,
      canCodexRunLocally: false,
      mustBeRunOnServer: true,
      description: item.notes || item.title,
      rollbackNote: "If container rollout fails, redeploy the previous known-good build."
    })),
    {
      id: "nginx-reload-confirmation",
      command: "nginx -t && nginx -s reload",
      environment: "nginx",
      riskLevel: "high",
      requiresUserApproval: true,
      canCodexRunLocally: false,
      mustBeRunOnServer: true,
      description: "Nginx reload is approval-required and must be run only in the confirmed server context.",
      rollbackNote: "Restore previous Nginx config and reload only after verification."
    }
  ];
}

export function buildRiskAcknowledgements(
  preflight: EbosProductionDeploymentPreflightReport,
  deploymentPlan: EbosProductionDeploymentPlanReport
) {
  return [
    `ready_to_deploy is not deployed; current preflight status is ${preflight.readinessStatus}.`,
    `Server command count requiring approval: ${deploymentPlan.deploymentPlan.serverCommands.length}.`,
    `Docker command count requiring approval: ${deploymentPlan.deploymentPlan.dockerCommands.length}.`,
    "Secret values must never be printed.",
    "Rollback is scoped; do not run destructive git reset, database reset, or broad cleanup commands."
  ];
}

export async function readLatestDeploymentApprovalGate(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; report: EbosDeploymentApprovalGate } | null> {
  const targetDate = options.targetDate ? toDateKey(options.targetDate) : null;
  const directory = join(options.reportsRoot ?? "reports/ebos", "deployment", "execution", "approvals").replace(/\\/g, "/");

  if (targetDate) {
    const exactPath = `${directory}/${targetDate}-deployment-approval-gate.json`;
    const exact = await readApprovalGateFile(exactPath);
    if (exact) return { filePath: exactPath, report: exact };
  }

  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-deployment-approval-gate.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = await readApprovalGateFile(filePath);
    return report ? { filePath, report } : null;
  } catch {
    return null;
  }
}

async function readApprovalGateFile(filePath: string) {
  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosDeploymentApprovalGate;
    return report.gateType === "production_deployment_approval_gate" ? report : null;
  } catch {
    return null;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function checklist(
  id: string,
  title: string,
  description: string
): EbosDeploymentApprovalChecklistItem {
  return {
    id,
    title,
    status: "pending",
    required: true,
    description
  };
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
