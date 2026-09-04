import type {
  EbosDeploymentCommandEnvironment,
  EbosDeploymentExecutionStatus,
  EbosDeploymentStatus
} from "./deployment-execution-types";

export type EbosDeploymentCommandResultStatus =
  | "not_run"
  | "success"
  | "failed"
  | "manual_required"
  | "skipped";

export type EbosDeploymentCommandResult = {
  id: string;
  command: string;
  environment: EbosDeploymentCommandEnvironment;
  status: EbosDeploymentCommandResultStatus;
  exitCode?: number;
  startedAt?: string;
  completedAt?: string;
  summary: string;
  evidence?: string[];
  warnings: string[];
};

export type EbosManualServerDeploymentResult = {
  serverCommandsCompleted: boolean;
  dockerCommandsCompleted: boolean;
  nginxCommandsCompleted: boolean;
  deployedAt?: string | null;
  commandSummaries?: string[];
  failures?: string[];
  notes: string;
  evidence: string[];
};

export type EbosManualServerDeploymentResultValidation = {
  valid: boolean;
  complete: boolean;
  blockers: string[];
  warnings: string[];
};

export type EbosProductionDeploymentStatusTransitionResult = {
  previousStatus: EbosDeploymentStatus;
  nextStatus: EbosDeploymentStatus;
  updated: boolean;
  reason: string;
  backupPath?: string;
  warnings: string[];
  forbiddenStatuses: EbosDeploymentStatus[];
};

export type EbosDeploymentVerificationReadiness = {
  postLaunchCheckAllowed: boolean;
  reason: string;
  command: string;
};

export type EbosProductionDeploymentExecutionReport = {
  reportType: "production_deployment_execution";
  targetDate: string;
  generatedAt: string;
  executionStatus: EbosDeploymentExecutionStatus;
  localCommandResults: EbosDeploymentCommandResult[];
  serverCommandResults: EbosDeploymentCommandResult[];
  dockerCommandResults: EbosDeploymentCommandResult[];
  nginxCommandResults: EbosDeploymentCommandResult[];
  verificationReadiness: EbosDeploymentVerificationReadiness;
  statusTransition: EbosProductionDeploymentStatusTransitionResult;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

export type EbosCommandResultsReadResult = {
  localCommandResults: EbosDeploymentCommandResult[];
  serverCommandResults: EbosDeploymentCommandResult[];
  dockerCommandResults: EbosDeploymentCommandResult[];
  nginxCommandResults: EbosDeploymentCommandResult[];
};
