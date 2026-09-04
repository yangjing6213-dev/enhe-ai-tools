export type EbosValidationLaunchStatus =
  | "prepared"
  | "ready_to_deploy"
  | "deployed_pending_verification"
  | "blocked";

export type EbosValidationDeploymentChecklistCategory =
  | "build"
  | "route"
  | "seo"
  | "tracking"
  | "validation_input"
  | "external_intake"
  | "deployment"
  | "rollback";

export type EbosValidationExecutionStatus =
  | "pass"
  | "warning"
  | "fail"
  | "manual_required";

export type EbosValidationDeploymentChecklistItem = {
  id: string;
  title: string;
  category: EbosValidationDeploymentChecklistCategory;
  status: EbosValidationExecutionStatus;
  evidence: string;
  command?: string;
  nextAction?: string;
};

export type EbosValidationSmokeCheckType =
  | "http_status"
  | "page_content"
  | "cta_present"
  | "metadata"
  | "tracking_plan";

export type EbosValidationSmokeTestItem = {
  id: string;
  url: string;
  expectedStatus: number;
  checkType: EbosValidationSmokeCheckType;
  expectedText?: string;
  command?: string;
  status: "pending" | "pass" | "fail" | "manual_required";
  notes: string;
};

export type EbosExternalPublishChannel =
  | "xianyu"
  | "taobao"
  | "whop"
  | "xiaohongshu"
  | "wechat"
  | "other";

export type EbosExternalPublishAsset = {
  channel: EbosExternalPublishChannel;
  targetProductOrDirection: string;
  sourceAssetPath: string;
  title: string;
  copySummary: string;
  requiredUserAction: string;
  dataFieldsToRecord: string[];
  warnings: string[];
};

export type EbosValidationLaunchExecutionStep = {
  id: string;
  title: string;
  owner: "codex" | "user";
  description: string;
  command?: string;
  verification: string;
};

export type EbosValidationLaunchExecutionReport = {
  reportType: "validation_launch_execution";
  targetDate: string;
  generatedAt: string;
  readinessReportPath?: string;
  runbookPath?: string;
  launchStatus: EbosValidationLaunchStatus;
  deploymentChecklist: EbosValidationDeploymentChecklistItem[];
  smokeTestPlan: EbosValidationSmokeTestItem[];
  externalPublishPack: EbosExternalPublishAsset[];
  dataIntakeWorkflow: EbosValidationLaunchExecutionStep[];
  codexExecutableSteps: EbosValidationLaunchExecutionStep[];
  userMinimumActions: string[];
  warnings: string[];
  blockers: string[];
  nextCommands: string[];
};

export type EbosValidationPostLaunchCheckStatus =
  | "dry_run"
  | "passed"
  | "warning"
  | "failed";

export type EbosValidationPostLaunchCheckItem = {
  id: string;
  url: string;
  expectedStatus: number;
  checkType: EbosValidationSmokeCheckType;
  dryRun: boolean;
  status: "pending" | "pass" | "fail" | "warning";
  actualStatus?: number;
  notes: string;
  warning?: string;
};

export type EbosValidationPostLaunchCheckReport = {
  reportType: "validation_post_launch_check";
  targetDate: string;
  generatedAt: string;
  siteUrl: string;
  dryRun: boolean;
  checks: EbosValidationPostLaunchCheckItem[];
  status: EbosValidationPostLaunchCheckStatus;
  warnings: string[];
  blockers: string[];
  nextActions: string[];
};
