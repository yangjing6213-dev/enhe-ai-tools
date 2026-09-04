import type {
  EbosDeploymentPlannedCommand,
  EbosProductionDeploymentPlanReport
} from "../deployment";
import type {
  EbosDeploymentCommandApproval,
  EbosDeploymentCommandEnvironment,
  EbosDeploymentExecutionContract,
  EbosDeploymentExecutionStatus,
  EbosDeploymentRiskLevel
} from "./deployment-execution-types";

export function buildDeploymentExecutionContract(options: {
  targetDate: string | Date;
  deploymentPlanReport: EbosProductionDeploymentPlanReport;
}): EbosDeploymentExecutionContract {
  const targetDate = toDateKey(options.targetDate);
  const plan = options.deploymentPlanReport;
  const deploymentScope = [
    "Validation page deployment for /validation/ai-prompt-kit and /en/validation/ai-prompt-kit",
    "EBOS deployment reports, scripts, and execution evidence"
  ];

  return {
    contractType: "production_deployment_execution_contract",
    targetDate,
    generatedAt: new Date().toISOString(),
    deploymentScope,
    localPreDeployCommands: plan.deploymentPlan.localCommands.map((item) => commandApproval(item, "local", "low", false)),
    serverDeploymentCommands: plan.deploymentPlan.serverCommands.map((item) => commandApproval(item, "server", "high", true)),
    dockerCommands: plan.deploymentPlan.dockerCommands.map((item) => commandApproval(item, "docker", "high", true)),
    nginxCommands: [
      {
        id: "nginx-reload-confirmation",
        command: "nginx -t && nginx -s reload",
        environment: "nginx",
        riskLevel: "high",
        requiresUserApproval: true,
        canCodexRunLocally: false,
        mustBeRunOnServer: true,
        description: "Nginx reload is listed as an approval-required production operation. Do not run before explicit user confirmation.",
        rollbackNote: "If Nginx reload breaks routing, restore the previous Nginx config and reload only after verification."
      }
    ],
    verificationCommands: plan.deploymentPlan.verificationCommands.map((item) => commandApproval(item, "verification", "low", false)),
    rollbackCommands: plan.rollbackPlan.commands,
    executionStatusTemplate: createExecutionStatusTemplate(targetDate, "not_started"),
    safetyRules: [
      "Do not print secret values or production environment variable values.",
      "Do not run destructive database commands.",
      "Do not run prisma migrate deploy; this step has no migration and migration deployment is forbidden.",
      "Do not run SSH, Docker, Nginx, or server commands before explicit user approval.",
      "Do not claim deployed until the post-launch check passes."
    ],
    warnings: [
      ...plan.warnings,
      "This contract records execution boundaries only; it does not deploy production."
    ]
  };
}

export function createExecutionStatusTemplate(
  targetDate: string | Date,
  deploymentStatus: EbosDeploymentExecutionStatus["deploymentStatus"] = "not_started"
): EbosDeploymentExecutionStatus {
  return {
    statusType: "production_deployment_execution_status",
    targetDate: toDateKey(targetDate),
    updatedAt: new Date().toISOString(),
    deploymentStatus,
    approvedByUser: false,
    localCommandsRun: [],
    serverCommandsRun: [],
    dockerCommandsRun: [],
    verificationCommandsRun: [],
    postLaunchCheckStatus: "not_run",
    notes: [],
    warnings: []
  };
}

function commandApproval(
  item: EbosDeploymentPlannedCommand,
  environment: EbosDeploymentCommandEnvironment,
  riskLevel: EbosDeploymentRiskLevel,
  requiresUserApproval: boolean
): EbosDeploymentCommandApproval {
  const command = item.command ?? `${item.title}: ${item.notes}`;
  return {
    id: item.id,
    command,
    environment,
    riskLevel,
    requiresUserApproval,
    canCodexRunLocally: environment === "local" || environment === "verification",
    mustBeRunOnServer: environment === "server" || environment === "docker" || environment === "nginx",
    description: item.notes || item.title,
    ...(requiresUserApproval ? { rollbackNote: "Requires explicit confirmation and rollback readiness before execution." } : {})
  };
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
