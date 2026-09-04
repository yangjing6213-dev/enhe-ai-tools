import type {
  EbosDeploymentOperatorRiskLevel
} from "../deployment-operator";
import type { EbosDeploymentStatus } from "../deployment-execution";

export type EbosServerDeploymentCommandEnvironment = "server" | "docker" | "nginx";

export type EbosServerDeploymentExecutionOrderStep =
  | "server_deploy"
  | "docker_commands"
  | "nginx_commands"
  | "status_recording";

export type EbosServerDeploymentCommandGroup = {
  groupId: string;
  title: string;
  environment: EbosServerDeploymentCommandEnvironment;
  commands: string[];
  expectedOutcome: string;
  failureHandling: string;
  evidenceToCollect: string[];
  rollbackNote: string;
  riskLevel: EbosDeploymentOperatorRiskLevel;
  approvalRequired: boolean;
};

export type EbosServerDeploymentCommandPack = {
  packType: "server_deployment_command_pack";
  targetDate: string;
  generatedAt: string;
  currentDeploymentStatus: EbosDeploymentStatus;
  manualRequiredCommands: string[];
  commandGroups: EbosServerDeploymentCommandGroup[];
  executionOrder: EbosServerDeploymentExecutionOrderStep[];
  resultInputTemplatePath: string;
  safetyWarnings: string[];
  rollbackNotes: string[];
  nextCommands: string[];
};

export type EbosServerDeploymentResultInput = {
  inputType: "server_deployment_result_input";
  targetDate: string;
  filledAt?: string;
  serverCommandsCompleted: boolean;
  dockerCommandsCompleted: boolean;
  nginxCommandsCompleted: boolean;
  deployedAt?: string | null;
  commandSummaries: string[];
  failures: string[];
  evidence: string[];
  notes: string;
};

export type EbosServerDeploymentResultValidation = {
  valid: boolean;
  canTransitionToDeployedPendingVerification: boolean;
  missingFields: string[];
  warnings: string[];
  blockers: string[];
};

export type EbosServerDeploymentResultTemplateWriteResult = {
  filePath: string;
  written: boolean;
  template: EbosServerDeploymentResultInput;
  skippedReason?: string;
};
