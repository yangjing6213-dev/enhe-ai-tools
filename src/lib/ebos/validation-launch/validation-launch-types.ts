export type EbosValidationLaunchReadinessStatus =
  | "ready"
  | "ready_with_warnings"
  | "needs_fixes"
  | "blocked";

export type EbosValidationLaunchStep = {
  id: string;
  title: string;
  description: string;
  owner: "codex" | "user";
  command?: string;
  verification: string;
};

export type EbosValidationExternalChannelStep = {
  channel: "xianyu" | "taobao" | "whop" | "xiaohongshu" | "wechat";
  title: string;
  description: string;
  assetHint: string;
  forbiddenActions: string[];
};

export type EbosValidationLaunchChecklist = {
  targetDate: string;
  codexSteps: EbosValidationLaunchStep[];
  userMinimumActions: string[];
  externalChannelSteps: EbosValidationExternalChannelStep[];
  dataIntakeSteps: EbosValidationLaunchStep[];
  postLaunchCommands: string[];
};

export type EbosValidationPageCheck = {
  path: string;
  filePath: string;
  exists: boolean;
  hasHero: boolean;
  hasSummary: boolean;
  hasCTA: boolean;
  hasFAQ: boolean;
  hasComplianceNotice: boolean;
  hasTrackingEvent: boolean;
  hasSeoMetadata: boolean;
  warnings: string[];
};

export type EbosValidationTrackingCheck = {
  eventName: string;
  expectedLocation: string;
  found: boolean;
  sourceFile: string;
  warnings: string[];
};

export type EbosValidationAssetCheck = {
  filePath: string;
  exists: boolean;
  purpose: string;
  readyForUse: boolean;
  warnings: string[];
};

export type EbosValidationBasicCheck = {
  key: string;
  label: string;
  passed: boolean;
  warnings: string[];
};

export type EbosValidationExternalIntakeCheck = {
  key: "external_intake_template" | "external_intake_input" | "external_intake_import_report";
  filePath: string;
  exists: boolean;
  readyForUse: boolean;
  warnings: string[];
};

export type EbosValidationLaunchReadinessReport = {
  reportType: "validation_launch_readiness";
  targetDate: string;
  generatedAt: string;
  validationPages: EbosValidationPageCheck[];
  assetFiles: EbosValidationAssetCheck[];
  trackingChecks: EbosValidationTrackingCheck[];
  seoGeoChecks: EbosValidationBasicCheck[];
  externalIntakeChecks: EbosValidationExternalIntakeCheck[];
  deploymentChecks: EbosValidationBasicCheck[];
  readinessScore: number;
  readinessStatus: EbosValidationLaunchReadinessStatus;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

export type EbosValidationLaunchRunbook = {
  runbookType: "validation_launch_operator_runbook";
  targetDate: string;
  generatedAt: string;
  launchObjective: string;
  validationTargets: string[];
  readinessReportPath?: string;
  readinessReport?: EbosValidationLaunchReadinessReport;
  codexSteps: EbosValidationLaunchStep[];
  userMinimumActions: string[];
  externalChannelSteps: EbosValidationExternalChannelStep[];
  dataIntakeSteps: EbosValidationLaunchStep[];
  postLaunchCommands: string[];
  rollbackNotes: string[];
  warnings: string[];
};
