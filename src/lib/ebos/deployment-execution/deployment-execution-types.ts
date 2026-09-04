export type EbosDeploymentApprovalStatus =
  | "awaiting_user_approval"
  | "approved"
  | "rejected"
  | "expired";

export type EbosDeploymentStatus =
  | "not_started"
  | "awaiting_approval"
  | "approved_not_executed"
  | "executing"
  | "deployed_pending_verification"
  | "verified"
  | "failed"
  | "rolled_back";

export type EbosDeploymentApprovalChecklistStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "not_applicable";

export type EbosDeploymentCommandEnvironment =
  | "local"
  | "server"
  | "docker"
  | "nginx"
  | "verification";

export type EbosDeploymentRiskLevel = "low" | "medium" | "high";

export type EbosDeploymentPostLaunchCheckStatus =
  | "not_run"
  | "dry_run"
  | "passed"
  | "failed";

export type EbosDeploymentApprovalChecklistItem = {
  id: string;
  title: string;
  status: EbosDeploymentApprovalChecklistStatus;
  required: boolean;
  description: string;
  evidence?: string;
};

export type EbosDeploymentCommandApproval = {
  id: string;
  command: string;
  environment: EbosDeploymentCommandEnvironment;
  riskLevel: EbosDeploymentRiskLevel;
  requiresUserApproval: boolean;
  canCodexRunLocally: boolean;
  mustBeRunOnServer: boolean;
  description: string;
  rollbackNote?: string;
};

export type EbosDeploymentApprovalGate = {
  gateType: "production_deployment_approval_gate";
  targetDate: string;
  generatedAt: string;
  preflightReportPath: string;
  deploymentPlanPath: string;
  siteUrl: string;
  deploymentScope: string[];
  approvalStatus: EbosDeploymentApprovalStatus;
  deploymentStatus: EbosDeploymentStatus;
  approvalChecklist: EbosDeploymentApprovalChecklistItem[];
  commandsRequiringApproval: EbosDeploymentCommandApproval[];
  codexAllowedActions: string[];
  userRequiredConfirmations: string[];
  riskAcknowledgements: string[];
  rollbackSummary: string;
  warnings: string[];
};

export type EbosDeploymentExecutionStatus = {
  statusType: "production_deployment_execution_status";
  targetDate: string;
  updatedAt: string;
  deploymentStatus: EbosDeploymentStatus;
  approvedByUser: boolean;
  approvedAt?: string;
  localCommandsRun: string[];
  serverCommandsRun: string[];
  dockerCommandsRun: string[];
  verificationCommandsRun: string[];
  postLaunchCheckStatus: EbosDeploymentPostLaunchCheckStatus;
  deployedCommit?: string;
  deployedAt?: string;
  verifiedAt?: string;
  notes: string[];
  warnings: string[];
};

export type EbosDeploymentExecutionContract = {
  contractType: "production_deployment_execution_contract";
  targetDate: string;
  generatedAt: string;
  deploymentScope: string[];
  localPreDeployCommands: EbosDeploymentCommandApproval[];
  serverDeploymentCommands: EbosDeploymentCommandApproval[];
  dockerCommands: EbosDeploymentCommandApproval[];
  nginxCommands: EbosDeploymentCommandApproval[];
  verificationCommands: EbosDeploymentCommandApproval[];
  rollbackCommands: string[];
  executionStatusTemplate: EbosDeploymentExecutionStatus;
  safetyRules: string[];
  warnings: string[];
};

export type EbosDeploymentExecutionRunbook = {
  reportType: "production_deployment_execution_runbook";
  targetDate: string;
  generatedAt: string;
  siteUrl: string;
  deploymentGoal: string;
  userConfirmationPhrase: string;
  codexPreApprovalCommands: EbosDeploymentCommandApproval[];
  commandsAfterApproval: EbosDeploymentCommandApproval[];
  dockerNginxNotes: string[];
  postDeploySmokeTestCommand: string;
  smokeTestFailureRollbackSteps: string[];
  smokeTestSuccessStatusUpdates: string[];
  externalDataNextSteps: string[];
  warnings: string[];
};

export type EbosDeploymentExecutionStatusSummary = {
  targetDate: string;
  approvedByUser: boolean;
  deploymentStatus: EbosDeploymentStatus;
  localCommandsRunCount: number;
  serverCommandsRunCount: number;
  dockerCommandsRunCount: number;
  verificationCommandsRunCount: number;
  postLaunchCheckStatus: EbosDeploymentPostLaunchCheckStatus;
  warnings: string[];
  statusMessage: string;
};
