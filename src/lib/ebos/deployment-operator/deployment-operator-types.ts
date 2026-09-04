import type {
  EbosDeploymentExecutionStatus,
  EbosDeploymentStatus
} from "../deployment-execution";

export type EbosDeploymentOperatorPhase =
  | "local_precheck"
  | "server_deploy"
  | "docker_restart"
  | "nginx_reload"
  | "post_launch_check"
  | "status_update"
  | "rollback";

export type EbosDeploymentOperatorActor =
  | "codex_local"
  | "user_server"
  | "manual_required";

export type EbosDeploymentOperatorItemStatus =
  | "pending"
  | "ready"
  | "blocked"
  | "manual_required";

export type EbosDeploymentOperatorRiskLevel = "low" | "medium" | "high";

export type EbosDeploymentCommandCategory =
  | "local"
  | "server"
  | "docker"
  | "nginx"
  | "verification"
  | "rollback";

export type EbosDeploymentAuditedCommand = {
  id: string;
  title: string;
  command: string;
  category: EbosDeploymentCommandCategory;
  source: string;
  manualRequired: boolean;
  dangerous: boolean;
  migration: boolean;
  secretExposure: boolean;
  warnings: string[];
};

export type EbosDeploymentCommandAudit = {
  commandsAudited: number;
  localCommands: EbosDeploymentAuditedCommand[];
  serverCommands: EbosDeploymentAuditedCommand[];
  dockerCommands: EbosDeploymentAuditedCommand[];
  nginxCommands: EbosDeploymentAuditedCommand[];
  verificationCommands: EbosDeploymentAuditedCommand[];
  rollbackCommands: EbosDeploymentAuditedCommand[];
  dangerousCommandsDetected: string[];
  migrationCommandsDetected: string[];
  secretExposureRisks: string[];
  manualRequiredCommands: EbosDeploymentAuditedCommand[];
  safeToProceed: boolean;
  warnings: string[];
};

export type EbosDeploymentOperatorChecklistItem = {
  id: string;
  title: string;
  phase: EbosDeploymentOperatorPhase;
  actor: EbosDeploymentOperatorActor;
  status: EbosDeploymentOperatorItemStatus;
  command?: string;
  riskLevel: EbosDeploymentOperatorRiskLevel;
  approvalRequired: boolean;
  evidence: string;
  rollbackNote?: string;
};

export type EbosDeploymentExecutionStep = {
  stepNumber: number;
  title: string;
  actor: EbosDeploymentOperatorActor;
  command?: string;
  expectedOutcome: string;
  failureHandling: string;
  statusUpdateHint: string;
  mustNotDo: string[];
};

export type EbosDeploymentStatusUpdateTemplate = {
  targetDate: string;
  currentStatus: EbosDeploymentStatus;
  allowedNextStatuses: EbosDeploymentStatus[];
  forbiddenStatuses: EbosDeploymentStatus[];
  statusUpdateRules: string[];
  templateAfterLocalCommands: Partial<EbosDeploymentExecutionStatus>;
  templateAfterServerCommands: Partial<EbosDeploymentExecutionStatus>;
  templateAfterPostLaunchCheck: Partial<EbosDeploymentExecutionStatus>;
  warnings: string[];
};

export type EbosDeploymentOperatorChecklistReport = {
  reportType: "production_deployment_operator_checklist";
  targetDate: string;
  generatedAt: string;
  currentDeploymentStatus: EbosDeploymentStatus;
  approvedByUser: boolean;
  deploymentScope: string[];
  commandAudit: EbosDeploymentCommandAudit;
  operatorChecklist: EbosDeploymentOperatorChecklistItem[];
  executionSteps: EbosDeploymentExecutionStep[];
  statusUpdateTemplate: EbosDeploymentStatusUpdateTemplate;
  postCommandVerificationPlan: string[];
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

export type EbosDeploymentOperatorBuildOptions = {
  targetDate: string | Date;
  siteUrl: string;
  currentDeploymentStatus: EbosDeploymentStatus;
  approvedByUser: boolean;
  deploymentScope?: string[];
  commandAudit: EbosDeploymentCommandAudit;
};
