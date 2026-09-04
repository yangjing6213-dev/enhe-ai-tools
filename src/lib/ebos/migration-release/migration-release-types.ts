export type EbosMigrationReleaseChecklistStatus =
  | "pending"
  | "pass"
  | "warning"
  | "fail"
  | "manual_required";

export type EbosMigrationReleaseChecklistItem = {
  id: string;
  title: string;
  required: boolean;
  status: EbosMigrationReleaseChecklistStatus;
  description: string;
  evidence?: string;
  blockerIfMissing: boolean;
};

export type EbosMigrationReleaseRunbook = {
  runbookType: "migration_release_mode_runbook";
  targetDate: string;
  generatedAt: string;
  migrationGuardVariable: "RUN_PRISMA_MIGRATE";
  defaultMigrationBehavior: "skip_unless_explicit";
  explicitEnableValue: "1";
  allowedUseCases: string[];
  forbiddenUseCases: string[];
  approvalChecklist: EbosMigrationReleaseChecklistItem[];
  preMigrationChecklist: EbosMigrationReleaseChecklistItem[];
  executionPlan: EbosMigrationReleaseChecklistItem[];
  postMigrationVerification: EbosMigrationReleaseChecklistItem[];
  rollbackPlan: EbosMigrationReleaseChecklistItem[];
  warnings: string[];
  nextActions: string[];
};

export type EbosMigrationReleaseFileRisk = {
  keyword: string;
  line: number;
  text: string;
  severity: "high";
};

export type EbosMigrationReleaseFile = {
  filePath: string;
  relativePath: string;
  destructiveRisks: EbosMigrationReleaseFileRisk[];
};

export type EbosMigrationReleaseCommandRisk = {
  command: string;
  riskType:
    | "migration_command"
    | "destructive_database_command"
    | "secret_exposure";
  riskLevel: "high";
  requiresExplicitApproval: boolean;
  message: string;
};

export type EbosMigrationReleaseRiskAudit = {
  auditType: "migration_release_risk_audit";
  targetDate: string;
  generatedAt: string;
  migrationFilesDetected: EbosMigrationReleaseFile[];
  pendingMigrationIntent: boolean;
  destructiveCommandRisks: EbosMigrationReleaseCommandRisk[];
  secretExposureRisks: string[];
  backupEvidenceRequired: boolean;
  approvalRequired: boolean;
  safeToRunMigration: boolean;
  blockers: string[];
  warnings: string[];
};

export type EbosMigrationReleaseStatusSummary = {
  status:
    | "not_generated"
    | "runbook_generated"
    | "audit_generated";
  targetDate: string;
  runbookPath?: string;
  riskAuditPath?: string;
  migrationGuardVariable: "RUN_PRISMA_MIGRATE";
  defaultMigrationBehavior: "skip_unless_explicit";
  explicitEnableValue: "1";
  safeToRunMigration: boolean;
  blockers: string[];
  warnings: string[];
  summary: string;
};

