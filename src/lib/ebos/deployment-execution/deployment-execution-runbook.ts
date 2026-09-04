import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionContract,
  EbosDeploymentExecutionRunbook
} from "./deployment-execution-types";

export function buildDeploymentExecutionRunbook(options: {
  targetDate: string | Date;
  siteUrl: string;
  approvalGate: EbosDeploymentApprovalGate;
  executionContract: EbosDeploymentExecutionContract;
}): EbosDeploymentExecutionRunbook {
  const targetDate = toDateKey(options.targetDate);
  const postDeploySmokeTestCommand = options.executionContract.verificationCommands[0]?.command
    ?? `npx tsx scripts/check-ebos-validation-post-launch.ts --date ${targetDate} --site-url ${normalizeSiteUrl(options.siteUrl)}`;

  return {
    reportType: "production_deployment_execution_runbook",
    targetDate,
    generatedAt: new Date().toISOString(),
    siteUrl: normalizeSiteUrl(options.siteUrl),
    deploymentGoal: "Deploy the validation pages only after explicit user approval, then verify public routes before any external channel data intake.",
    userConfirmationPhrase: "确认部署验证页",
    codexPreApprovalCommands: options.executionContract.localPreDeployCommands,
    commandsAfterApproval: [
      ...options.executionContract.serverDeploymentCommands,
      ...options.executionContract.dockerCommands,
      ...options.executionContract.nginxCommands
    ],
    dockerNginxNotes: [
      "Docker and Nginx commands are production operations and must not run before approval.",
      "Confirm server project path and compose file before executing any Docker command.",
      "Run Nginx config test before reload if Nginx reload is needed."
    ],
    postDeploySmokeTestCommand,
    smokeTestFailureRollbackSteps: options.executionContract.rollbackCommands.length
      ? options.executionContract.rollbackCommands
      : ["Stop deployment work, restore the previous known-good build, and rerun post-launch checks."],
    smokeTestSuccessStatusUpdates: [
      "Update deployment execution status to verified only after the post-launch check passes.",
      "Record deployedAt, deployedCommit, and verification command output summary without secrets.",
      "Regenerate EBOS weekly and monthly reports after verification."
    ],
    externalDataNextSteps: [
      "Start real external channel publishing only after deployment status is verified.",
      "Fill validation external intake with observed metrics only; keep unknown metrics as 0.",
      "Regenerate validation result, decision, weekly, and monthly reports after intake."
    ],
    warnings: [
      ...options.approvalGate.warnings,
      "This runbook does not deploy production and does not imply approval."
    ]
  };
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
