import type {
  EbosActionItem,
  EbosDataSourceState,
  EbosOKR,
  EbosReport,
  EbosWarning
} from "../types";
import type {
  EbosInternalDatabaseSnapshot,
  EbosManualInput,
  EbosWeeklyDataAdapter
} from "../adapters/adapter-types";
import type { EbosWebsiteHealthSnapshot } from "../health";
import type { EbosIntegrationReadinessReport } from "../integrations";
import type { EbosEvidenceCatalogEntry } from "../evidence";
import type { EbosDecisionReport } from "../decision";
import type { EbosValidationResultReport } from "../validation";
import type { EbosValidationLaunchReadinessReport } from "../validation-launch";
import type {
  EbosValidationLaunchExecutionReport,
  EbosValidationPostLaunchCheckReport
} from "../validation-launch-execution";
import type { EbosProductionDeploymentPreflightReport } from "../deployment";
import type {
  EbosDeploymentApprovalGate,
  EbosDeploymentExecutionStatus
} from "../deployment-execution";
import type { EbosDeploymentOperatorChecklistReport } from "../deployment-operator";
import type { EbosExternalPublishingStatusSummary } from "../external-publishing";
import type { EbosSyntheticScenarioStatusSummary } from "../synthetic-scenarios";
import type { EbosOptimizedValidationPageRedeployStatusSummary } from "../post-launch";
import type { EbosMigrationReleaseStatusSummary } from "../migration-release";

export type EbosWeeklyReportOptions = {
  targetDate?: Date;
  manualInput?: EbosManualInput;
  includeHtml?: boolean;
  adapters?: EbosWeeklyDataAdapter[];
  websiteHealthSnapshot?: EbosWebsiteHealthSnapshot;
  integrationReadinessReport?: EbosIntegrationReadinessReport;
  evidenceCatalogEntries?: EbosEvidenceCatalogEntry[];
  evidenceWarnings?: EbosWarning[];
  decisionReport?: EbosDecisionReport;
  validationResultReport?: EbosValidationResultReport | null;
  validationLaunchReadinessReport?: EbosValidationLaunchReadinessReport;
  validationLaunchExecutionReport?: EbosValidationLaunchExecutionReport;
  validationPostLaunchCheckReport?: EbosValidationPostLaunchCheckReport;
  productionDeploymentPreflightReport?: EbosProductionDeploymentPreflightReport;
  productionDeploymentApprovalGate?: EbosDeploymentApprovalGate;
  deploymentExecutionStatus?: EbosDeploymentExecutionStatus;
  deploymentOperatorChecklist?: EbosDeploymentOperatorChecklistReport;
  externalPublishingStatus?: EbosExternalPublishingStatusSummary;
  syntheticFailureScenarioStatus?: EbosSyntheticScenarioStatusSummary;
  optimizedValidationPageRedeployStatus?: EbosOptimizedValidationPageRedeployStatusSummary;
  migrationReleaseStatus?: EbosMigrationReleaseStatusSummary;
};

export type EbosWeeklyPlan = {
  okrs: EbosOKR[];
  actionItems: EbosActionItem[];
};

export type EbosWeeklyReportResult = {
  report: EbosReport;
  markdown: string;
  html: string;
  nextWeekPlan: EbosWeeklyPlan;
  dataSourceStatus: EbosDataSourceState[];
  snapshot: EbosInternalDatabaseSnapshot;
  deploymentExecutionStatus?: EbosDeploymentExecutionStatus;
  externalPublishingStatus?: EbosExternalPublishingStatusSummary;
  syntheticFailureScenarioStatus?: EbosSyntheticScenarioStatusSummary;
  optimizedValidationPageRedeployStatus?: EbosOptimizedValidationPageRedeployStatusSummary;
  migrationReleaseStatus?: EbosMigrationReleaseStatusSummary;
};
