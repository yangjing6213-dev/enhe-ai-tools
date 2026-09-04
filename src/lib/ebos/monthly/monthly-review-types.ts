import type { EbosConfidenceLevel, EbosOKR } from "../types";
import type {
  EbosEvidenceActionItem,
  EbosEvidenceKind,
  EbosEvidenceWarning
} from "../evidence";
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

export type EbosMonthlyEvidenceUsed = {
  catalogEntryId: string;
  evidenceKind: EbosEvidenceKind;
  targetDate: string;
  score?: number;
  confidence: EbosConfidenceLevel;
  filePath: string;
  summary?: Record<string, unknown>;
};

export type EbosMonthlyStrategicFinding = {
  title: string;
  description: string;
  evidenceRefs: string[];
  severity: "info" | "opportunity" | "warning" | "critical";
  recommendation: string;
};

export type EbosMonthlyDecision = {
  title: string;
  reason: string;
  evidenceRefs: string[];
  priority: "low" | "medium" | "high" | "critical";
  owner: "human" | "codex" | "system";
};

export type EbosMonthlyReview = {
  reportType: "monthly";
  targetMonth: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  evidenceCatalogPath: string;
  evidenceUsed: EbosMonthlyEvidenceUsed[];
  overallScore: number | null;
  confidence: EbosConfidenceLevel;
  executiveSummary: string;
  strategicFindings: EbosMonthlyStrategicFinding[];
  majorWins: EbosMonthlyStrategicFinding[];
  majorRisks: EbosMonthlyStrategicFinding[];
  failedAssumptions: EbosMonthlyStrategicFinding[];
  growthOpportunities: EbosMonthlyStrategicFinding[];
  stopDoing: EbosMonthlyDecision[];
  keepDoing: EbosMonthlyDecision[];
  startDoing: EbosMonthlyDecision[];
  nextMonthOKRs: EbosOKR[];
  codexTasks: EbosMonthlyDecision[];
  dataGaps: string[];
  warnings: EbosEvidenceWarning[];
  actionItems: EbosEvidenceActionItem[];
  deploymentExecutionStatus?: EbosDeploymentExecutionStatus;
  externalPublishingStatus?: EbosExternalPublishingStatusSummary;
  syntheticFailureScenarioStatus?: EbosSyntheticScenarioStatusSummary;
  optimizedValidationPageRedeployStatus?: EbosOptimizedValidationPageRedeployStatusSummary;
  migrationReleaseStatus?: EbosMigrationReleaseStatusSummary;
};

export type EbosMonthlyReviewBuildOptions = {
  targetDate?: Date;
  catalogPath?: string;
  catalog?: import("../evidence").EbosEvidenceCatalog;
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
  manualInput?: {
    executiveNote?: string;
  };
};

export type EbosMonthlyReviewPlan = {
  nextMonthOKRs: EbosOKR[];
  codexTasks: EbosMonthlyDecision[];
  actionItems: EbosEvidenceActionItem[];
  stopDoing: EbosMonthlyDecision[];
  keepDoing: EbosMonthlyDecision[];
  startDoing: EbosMonthlyDecision[];
};
