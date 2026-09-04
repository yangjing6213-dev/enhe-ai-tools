export type EbosDeploymentReadinessStatus =
  | "ready_to_deploy"
  | "needs_fixes"
  | "blocked";

export type EbosDeploymentCheckStatus =
  | "pass"
  | "warning"
  | "fail"
  | "manual_required";

export type EbosDeploymentCheckCategory =
  | "build"
  | "route"
  | "env"
  | "docker"
  | "nginx"
  | "script"
  | "smoke"
  | "rollback";

export type EbosDeploymentScriptKey =
  | "lint"
  | "typecheck"
  | "build"
  | "start"
  | "test"
  | "prisma:generate";

export type EbosDeploymentConfigSummary = {
  packageManagerDetected: "npm" | "pnpm" | "yarn" | "unknown";
  scriptsDetected: Record<EbosDeploymentScriptKey, boolean>;
  nextConfigDetected: boolean;
  dockerfileDetected: boolean;
  dockerComposeDetected: boolean;
  nginxConfigDetected: boolean;
  deployDocsDetected: boolean;
  standaloneOutputDetected: boolean;
  warnings: string[];
};

export type EbosDeploymentCheckItem = {
  id: string;
  category: EbosDeploymentCheckCategory;
  title: string;
  status: EbosDeploymentCheckStatus;
  evidence: string;
  filePath?: string;
  command?: string;
  nextAction?: string;
};

export type EbosDeploymentPlannedCommand = {
  id: string;
  title: string;
  status: "ready" | "manual_required";
  command?: string;
  notes: string;
};

export type EbosDeploymentCommandPlan = {
  localCommands: EbosDeploymentPlannedCommand[];
  serverCommands: EbosDeploymentPlannedCommand[];
  dockerCommands: EbosDeploymentPlannedCommand[];
  verificationCommands: EbosDeploymentPlannedCommand[];
  notes: string[];
  warnings: string[];
};

export type EbosRollbackPlan = {
  rollbackStrategy: string;
  filesToRevert: string[];
  commands: string[];
  dataSafetyNotes: string[];
  warnings: string[];
};

export type EbosProductionDeploymentPreflightReport = {
  reportType: "production_deployment_preflight";
  targetDate: string;
  generatedAt: string;
  siteUrl: string;
  validationRoutes: string[];
  configSummary: EbosDeploymentConfigSummary;
  buildChecks: EbosDeploymentCheckItem[];
  routeChecks: EbosDeploymentCheckItem[];
  environmentChecks: EbosDeploymentCheckItem[];
  dockerChecks: EbosDeploymentCheckItem[];
  nginxChecks: EbosDeploymentCheckItem[];
  deploymentPlan: EbosDeploymentCommandPlan;
  rollbackPlan: EbosRollbackPlan;
  postDeploySmokeTests: EbosDeploymentCheckItem[];
  readinessScore: number;
  readinessStatus: EbosDeploymentReadinessStatus;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

export type EbosProductionDeploymentPlanReport = {
  reportType: "production_deployment_plan";
  targetDate: string;
  generatedAt: string;
  siteUrl: string;
  preflightStatus?: EbosDeploymentReadinessStatus;
  deploymentPlan: EbosDeploymentCommandPlan;
  rollbackPlan: EbosRollbackPlan;
  userConfirmations: string[];
  warnings: string[];
};
