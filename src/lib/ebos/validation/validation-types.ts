import type { EbosValidationMethod } from "../decision";

export type EbosValidationResultStatus = "not_started" | "running" | "completed" | "skipped";

export type EbosValidationSuccessStatus =
  | "success"
  | "partial_success"
  | "failed"
  | "inconclusive"
  | "not_started";

export type EbosValidationDecisionRecommendation =
  | "continue"
  | "adjust"
  | "stop"
  | "scale"
  | "needs_more_data";

export type EbosValidationWarning = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  planId?: string;
  source?: string;
};

export type EbosValidationInputCompletenessLevel = "empty" | "low" | "medium" | "high";

export type EbosValidationInputCompleteness = {
  totalPlans: number;
  completedPlans: number;
  plansWithAnySignal: number;
  totalTrackableFields: number;
  filledTrackableFields: number;
  completenessPercent: number;
  level: EbosValidationInputCompletenessLevel;
  suggestedFieldsToFill: Record<string, string[]>;
};

export type EbosValidationChannelAttributionChannel =
  | "marketplace_listing"
  | "product_page"
  | "manual_outreach"
  | "pricing_test";

export type EbosValidationChannelAttributionStatus =
  | "no_data"
  | "exposure_only"
  | "engaged"
  | "converted"
  | "refund_risk";

export type EbosValidationChannelAttribution = {
  channel: EbosValidationChannelAttributionChannel;
  status: EbosValidationChannelAttributionStatus;
  metrics: Record<string, number | string | string[]>;
  summary: string;
  recommendations: string[];
};

export type EbosValidationChannelAttributionSummary = {
  planId: string;
  channels: EbosValidationChannelAttribution[];
  summary: string[];
  recommendations: string[];
};

export type EbosValidationChannelResult = {
  channel: string;
  metricLabel?: string;
  metricValue?: number;
  ctaClicks?: number;
  leads?: number;
  presaleOrders?: number;
  paidOrders?: number;
  revenue?: number;
  notes?: string;
};

export type EbosValidationResultInput = {
  planId: string;
  status: EbosValidationResultStatus;
  actualMetricValue?: number;
  actualMetricLabel?: string;
  pageViews?: number;
  productPageViews?: number;
  productPageCtaClicks?: number;
  listingViews?: number;
  clicks?: number;
  favorites?: number;
  messages?: number;
  orders?: number;
  conversionRate?: number;
  ctaClicks?: number;
  leads?: number;
  presaleOrders?: number;
  paidOrders?: number;
  revenue?: number;
  refundCount?: number;
  priceShown?: string;
  manualOutreachCount?: number;
  outreachCount?: number;
  positiveReplies?: number;
  negativeReplies?: number;
  callsBooked?: number;
  contentViews?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  supportQuestions?: number;
  feedback?: string[];
  buyerFeedback?: string[];
  deliveryFeedback?: string[];
  userFeedback?: string[];
  channelResults?: EbosValidationChannelResult[];
  notes?: string;
  completedAt?: string;
};

export type EbosValidationPlanTracker = {
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
  resultInput: EbosValidationResultInput;
};

export type EbosValidationTracker = {
  trackerType: "validation_tracker";
  targetDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  decisionReportPath: string;
  topPriorityDirection: string;
  topExistingProduct?: string;
  validationPlans: EbosValidationPlanTracker[];
  instructions: string[];
  manualInputSchema: Record<string, unknown>;
  warnings: EbosValidationWarning[];
};

export type EbosValidationInputFile = {
  trackerPath?: string;
  targetDate?: string;
  results: EbosValidationResultInput[];
  warnings?: EbosValidationWarning[];
};

export type EbosValidationReadResult = {
  input: EbosValidationInputFile;
  warnings: EbosValidationWarning[];
};

export type EbosValidationAnalysis = {
  planId: string;
  title: string;
  targetDirection: string;
  targetProduct?: string;
  status: EbosValidationResultStatus;
  successStatus: EbosValidationSuccessStatus;
  score: number;
  resultInput: EbosValidationResultInput;
  evidenceSummary: string[];
  channelAttributionSummary: EbosValidationChannelAttributionSummary;
  inputCompleteness: EbosValidationInputCompleteness;
  dataQualityWarnings: string[];
  decisionRecommendation: EbosValidationDecisionRecommendation;
  reason: string;
  nextActions: string[];
  risks: string[];
  warnings: string[];
};

export type EbosValidationExternalIntakeStatus =
  | "not_generated"
  | "template_generated_unfilled"
  | "input_filled_not_imported"
  | "dry_run_available"
  | "imported";

export type EbosValidationExternalIntakeSummary = {
  status: EbosValidationExternalIntakeStatus;
  templatePath?: string;
  inputPath?: string;
  importReportPath?: string;
  importedChannelsCount: number;
  importedPlansCount: number;
  appliedChangesCount: number;
  skippedChangesCount: number;
  warnings: string[];
  summary: string;
};

export type EbosValidationResultReport = {
  reportType: "validation_result_report";
  targetDate: string;
  generatedAt: string;
  trackerPath: string;
  inputPath?: string;
  captureReportPath?: string;
  captureSummary?: {
    analyticsAvailable: boolean;
    eventsDetected: number;
    ctaClicksDetected: number;
    ordersAvailable: boolean;
    paidOrders: number;
    revenue: number;
    refundCount: number;
    manualSlotsCount: number;
    warnings: string[];
  };
  externalIntakeSummary?: EbosValidationExternalIntakeSummary;
  analyses: EbosValidationAnalysis[];
  overallValidationScore: number;
  summary: string;
  continueDirections: string[];
  adjustDirections: string[];
  stopDirections: string[];
  scaleDirections: string[];
  codexTasks: string[];
  humanTasks: string[];
  warnings: string[];
};
