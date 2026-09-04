import type { EbosConfidenceLevel } from "../types";
import type {
  EbosEvidenceActionItem,
  EbosEvidenceKind,
  EbosEvidenceWarning
} from "../evidence";

export type EbosDecisionRecommendation =
  | "validate_this_week"
  | "prepare_landing_page"
  | "create_content_test"
  | "improve_existing_product"
  | "watch"
  | "ignore";

export type EbosExistingProductRecommendation =
  | "validate_this_week"
  | "fix_product_page_first"
  | "fix_delivery_first"
  | "watch";

export type EbosValidationMethod =
  | "landing_page"
  | "presale"
  | "content_test"
  | "marketplace_listing"
  | "manual_outreach"
  | "pricing_test";

export type EbosDecisionEvidenceUsed = {
  evidenceKind: EbosEvidenceKind;
  filePath: string;
  targetDate: string;
  confidence: EbosConfidenceLevel;
  score?: number;
};

export type EbosDecisionAction = {
  title: string;
  reason: string;
  evidenceRefs: string[];
};

export type EbosEvidenceDecisionInput = {
  marketEvidence?: unknown;
  competitorEvidence?: unknown;
  productEvidence?: unknown;
  revenueEvidence?: unknown;
  seoEvidence?: unknown;
  geoEvidence?: unknown;
  weeklyReport?: unknown;
  monthlyReview?: unknown;
};

export type EbosPriorityProductDirection = {
  id: string;
  name: string;
  description: string;
  sourceSignals: string[];
  marketScore: number;
  competitorScore: number;
  productFitScore: number;
  revenueUrgencyScore: number;
  seoPotentialScore: number;
  geoPotentialScore: number;
  buildDifficultyScore: number;
  validationSpeedScore: number;
  totalPriorityScore: number;
  recommendation: EbosDecisionRecommendation;
  reason: string;
  risks: string[];
  suggestedFormats: string[];
  suggestedPriceRange: string;
  nextActions: string[];
};

export type EbosPriorityExistingProduct = {
  productName: string;
  slug?: string;
  readinessScore: number;
  revenueStatus: string;
  seoGeoReadiness: string;
  conversionRisks: string[];
  totalPriorityScore: number;
  recommendation: EbosExistingProductRecommendation;
  reason: string;
  nextActions: string[];
};

export type EbosValidationPlan = {
  id: string;
  title: string;
  targetDirection: string;
  targetProduct?: string;
  objective: string;
  hypothesis: string;
  validationMethod: EbosValidationMethod;
  successMetric: string;
  minimumSuccessThreshold: string;
  durationDays: number;
  requiredAssets: string[];
  codexTasks: string[];
  humanTasks: string[];
  risks: string[];
};

export type EbosDecisionReport = {
  reportType: "decision";
  targetDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  evidenceCatalogPath: string;
  evidenceUsed: EbosDecisionEvidenceUsed[];
  overallConfidence: EbosConfidenceLevel;
  strategicSummary: string;
  priorityProductDirections: EbosPriorityProductDirection[];
  priorityExistingProducts: EbosPriorityExistingProduct[];
  validationPlans: EbosValidationPlan[];
  stopDoing: EbosDecisionAction[];
  doNext: EbosDecisionAction[];
  codexTasks: EbosEvidenceActionItem[];
  risks: string[];
  warnings: EbosEvidenceWarning[];
  dataGaps: string[];
};

export type EbosDecisionEvidenceReadResult = {
  input: EbosEvidenceDecisionInput;
  evidenceUsed: EbosDecisionEvidenceUsed[];
  warnings: EbosEvidenceWarning[];
  dataGaps: string[];
  evidenceCatalogPath: string;
};

export type EbosDecisionPriorities = {
  priorityProductDirections: EbosPriorityProductDirection[];
  priorityExistingProducts: EbosPriorityExistingProduct[];
};
