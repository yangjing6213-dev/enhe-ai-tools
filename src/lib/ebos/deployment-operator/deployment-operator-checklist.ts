import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { buildDeploymentExecutionSteps } from "./deployment-execution-step-planner";
import { buildDeploymentStatusUpdateTemplate } from "./deployment-status-update-template";
import type {
  EbosDeploymentAuditedCommand,
  EbosDeploymentOperatorBuildOptions,
  EbosDeploymentOperatorChecklistItem,
  EbosDeploymentOperatorChecklistReport
} from "./deployment-operator-types";

export function buildDeploymentOperatorChecklist(
  options: EbosDeploymentOperatorBuildOptions
): EbosDeploymentOperatorChecklistReport {
  const targetDate = toDateKey(options.targetDate);
  const commandAudit = options.commandAudit;
  const statusUpdateTemplate = buildDeploymentStatusUpdateTemplate({
    targetDate,
    currentStatus: options.currentDeploymentStatus
  });
  const operatorChecklist = [
    ...buildLocalPrecheckItems(targetDate),
    ...commandAudit.serverCommands.map((command) => commandItem(command, "server_deploy")),
    ...commandAudit.dockerCommands.map((command) => commandItem(command, "docker_restart")),
    ...commandAudit.nginxCommands.map((command) => commandItem(command, "nginx_reload")),
    checklistItem({
      id: "post-launch-check",
      title: "Run post-launch validation check after user confirms deployment",
      phase: "post_launch_check",
      actor: "codex_local",
      status: commandAudit.safeToProceed ? "ready" : "blocked",
      command: `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${normalizeSiteUrl(options.siteUrl)}`,
      riskLevel: "low",
      approvalRequired: false,
      evidence: "Run only after server deployment commands are confirmed complete.",
      rollbackNote: "If route checks fail, keep status pending verification and review scoped rollback."
    }),
    checklistItem({
      id: "status-update",
      title: "Update deployment execution status from observed results only",
      phase: "status_update",
      actor: "codex_local",
      status: "pending",
      riskLevel: "medium",
      approvalRequired: false,
      evidence: "Use the status update template; do not write verified until post-launch check passes."
    }),
    ...buildRollbackItems(commandAudit.rollbackCommands)
  ];
  const executionSteps = buildDeploymentExecutionSteps({
    targetDate,
    siteUrl: options.siteUrl,
    manualRequiredCommandsCount: commandAudit.manualRequiredCommands.length,
    safeToProceed: commandAudit.safeToProceed
  });
  const blockers = [
    ...commandAudit.dangerousCommandsDetected.map((command) => `Dangerous command: ${redactCommand(command)}`),
    ...commandAudit.migrationCommandsDetected.map((command) => `Migration command forbidden: ${redactCommand(command)}`),
    ...commandAudit.secretExposureRisks.map(() => "Secret exposure command detected and redacted.")
  ];
  const warnings = [
    ...commandAudit.warnings,
    "This checklist does not execute deployment commands.",
    "Server, Docker, and Nginx commands remain manual_required."
  ];

  return {
    reportType: "production_deployment_operator_checklist",
    targetDate,
    generatedAt: new Date().toISOString(),
    currentDeploymentStatus: options.currentDeploymentStatus,
    approvedByUser: options.approvedByUser,
    deploymentScope: options.deploymentScope ?? [
      "Validation page deployment for /validation/ai-prompt-kit and /en/validation/ai-prompt-kit"
    ],
    commandAudit,
    operatorChecklist,
    executionSteps,
    statusUpdateTemplate,
    postCommandVerificationPlan: [
      "Confirm user-reported server command completion before running post-launch check.",
      `Run npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${normalizeSiteUrl(options.siteUrl)} only after deployment execution.`,
      "If post-launch check passes, status may move to verified.",
      "If post-launch check fails, keep status deployed_pending_verification or failed and prepare scoped rollback."
    ],
    blockers,
    warnings,
    nextActions: commandAudit.safeToProceed
      ? [
          "Ask the user whether to enter real production deployment execution.",
          "Keep server/Docker/Nginx commands manual until explicit executable environment is confirmed."
        ]
      : [
          "Fix command audit blockers before any production execution.",
          "Regenerate the operator checklist after blockers are removed."
        ]
  };
}

export async function readDeploymentOperatorChecklist(options: {
  targetDate: string | Date;
  reportsRoot?: string;
}): Promise<{ filePath: string; report: EbosDeploymentOperatorChecklistReport } | null> {
  const targetDate = toDateKey(options.targetDate);
  const filePath = join(
    options.reportsRoot ?? "reports/ebos",
    "deployment",
    "operator",
    `${targetDate}-deployment-operator-checklist.json`
  ).replace(/\\/g, "/");

  try {
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosDeploymentOperatorChecklistReport;
    return report.reportType === "production_deployment_operator_checklist"
      ? { filePath, report }
      : null;
  } catch {
    return null;
  }
}

export async function readLatestDeploymentOperatorChecklist(options: {
  targetDate?: string | Date;
  reportsRoot?: string;
} = {}): Promise<{ filePath: string; report: EbosDeploymentOperatorChecklistReport } | null> {
  if (options.targetDate) {
    return readDeploymentOperatorChecklist({
      targetDate: options.targetDate,
      reportsRoot: options.reportsRoot
    });
  }

  const directory = join(options.reportsRoot ?? "reports/ebos", "deployment", "operator").replace(/\\/g, "/");
  try {
    const fileName = (await readdir(directory))
      .filter((name) => name.endsWith("-deployment-operator-checklist.json"))
      .sort()
      .at(-1);
    if (!fileName) return null;
    const filePath = `${directory}/${fileName}`;
    const report = JSON.parse(await readFile(filePath, "utf8")) as EbosDeploymentOperatorChecklistReport;
    return report.reportType === "production_deployment_operator_checklist" ? { filePath, report } : null;
  } catch {
    return null;
  }
}

function buildLocalPrecheckItems(targetDate: string): EbosDeploymentOperatorChecklistItem[] {
  return [
    localItem("local-lint", "Run lint locally", "npm run lint"),
    localItem("local-typecheck", "Run typecheck locally", "npm run typecheck"),
    localItem("local-build", "Run production build locally", "npm run build"),
    localItem("local-status-check", "Check deployment execution status", `npx tsx scripts/check-ebos-deployment-execution-status.ts --date ${targetDate}`)
  ];
}

function localItem(id: string, title: string, command: string): EbosDeploymentOperatorChecklistItem {
  return checklistItem({
    id,
    title,
    phase: "local_precheck",
    actor: "codex_local",
    status: "ready",
    command,
    riskLevel: "low",
    approvalRequired: false,
    evidence: "Local precheck command; safe for Codex to run locally."
  });
}

function commandItem(
  command: EbosDeploymentAuditedCommand,
  phase: "server_deploy" | "docker_restart" | "nginx_reload"
): EbosDeploymentOperatorChecklistItem {
  return checklistItem({
    id: command.id,
    title: command.title,
    phase,
    actor: "user_server",
    status: command.dangerous || command.migration || command.secretExposure ? "blocked" : "manual_required",
    command: command.secretExposure ? undefined : command.command,
    riskLevel: "high",
    approvalRequired: true,
    evidence: command.warnings.join(" ") || "Manual server-side deployment command.",
    rollbackNote: "Stop and use scoped rollback if this command fails."
  });
}

function buildRollbackItems(commands: EbosDeploymentAuditedCommand[]): EbosDeploymentOperatorChecklistItem[] {
  if (commands.length === 0) {
    return [checklistItem({
      id: "rollback-scoped-default",
      title: "Prepare scoped rollback only",
      phase: "rollback",
      actor: "manual_required",
      status: "pending",
      riskLevel: "high",
      approvalRequired: true,
      evidence: "Use the reviewed rollback plan; do not reset database or delete EBOS reports.",
      rollbackNote: "Rollback requires explicit user confirmation."
    })];
  }

  return commands.map((command) => checklistItem({
    id: command.id,
    title: command.title,
    phase: "rollback",
    actor: "manual_required",
    status: command.dangerous || command.migration || command.secretExposure ? "blocked" : "pending",
    command: command.secretExposure ? undefined : command.command,
    riskLevel: "high",
    approvalRequired: true,
    evidence: "Rollback step from deployment plan; execute only if needed and confirmed.",
    rollbackNote: "Do not run broad reset or destructive database commands."
  }));
}

function checklistItem(item: EbosDeploymentOperatorChecklistItem): EbosDeploymentOperatorChecklistItem {
  return item;
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function redactCommand(command: string) {
  return /(\.env|printenv|^env$)/i.test(command) ? "[redacted secret-risk command]" : command;
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
