export type EbosSyntheticScenarioChannel =
  | "manual_outreach"
  | "wechat"
  | "xiaohongshu"
  | "xianyu"
  | "taobao"
  | "whop";

export type EbosSyntheticChannelResult = {
  channel: EbosSyntheticScenarioChannel;
  simulatedPublished: boolean;
  simulatedViews: number;
  simulatedClicks: number;
  simulatedSaves: number;
  simulatedShares: number;
  simulatedMessages: number;
  simulatedLeads: number;
  simulatedPositiveReplies: number;
  simulatedNegativeReplies: number;
  simulatedOrders: number;
  simulatedPaidOrders: number;
  simulatedRevenue: number;
  simulatedRefundCount: number;
  simulatedFeedbackThemes: string[];
  failureNotes: string;
};

export type EbosSyntheticFunnelSummary = {
  simulatedPublishedChannelsCount: number;
  simulatedViews: number;
  simulatedClicks: number;
  simulatedSaves: number;
  simulatedShares: number;
  simulatedMessages: number;
  simulatedLeads: number;
  simulatedPositiveReplies: number;
  simulatedNegativeReplies: number;
  simulatedOrders: number;
  simulatedPaidOrders: number;
  simulatedRevenue: number;
  simulatedRefundCount: number;
  simulatedClickRate: number;
  simulatedMessageRate: number;
  simulatedLeadRate: number;
  simulatedPaidConversionRate: number;
  notes: string[];
};

export type EbosSyntheticFailureScenario = {
  scenarioType: "synthetic_failure_scenario";
  targetDate: string;
  generatedAt: string;
  synthetic: true;
  simulationPurpose: string;
  failureAssumptions: string[];
  simulatedChannelResults: EbosSyntheticChannelResult[];
  simulatedFunnelSummary: EbosSyntheticFunnelSummary;
  constraints: string[];
  warnings: string[];
};

export type EbosSyntheticFailureAnalysis = {
  analysisType: "synthetic_failure_analysis";
  targetDate: string;
  generatedAt: string;
  synthetic: true;
  simulatedScenarioPath?: string;
  funnelDiagnosis: string[];
  likelyFailureReasons: string[];
  pageIssues: string[];
  offerIssues: string[];
  channelIssues: string[];
  pricingIssues: string[];
  trustIssues: string[];
  recommendedFixes: string[];
  nextExperimentPlan: string[];
  warnings: string[];
};

export type EbosSyntheticOptimizationPlan = {
  planType: "synthetic_optimization_plan";
  targetDate: string;
  generatedAt: string;
  synthetic: true;
  priorityFixes: string[];
  copywritingChanges: string[];
  landingPageChanges: string[];
  offerChanges: string[];
  channelStrategyChanges: string[];
  nextSprintActions: string[];
  successCriteria: string[];
  warnings: string[];
};

export type EbosSyntheticOptimizationImplementation = {
  reportType: "synthetic_optimization_implementation";
  targetDate: string;
  generatedAt: string;
  synthetic: true;
  sourceOptimizationPlanPath?: string;
  implementedFixes: string[];
  filesChanged: string[];
  ctaChanges: string[];
  offerChanges: string[];
  pricingTestChanges: string[];
  copywritingChanges: string[];
  remainingRisks: string[];
  nextRealValidationPlan: string[];
  warnings: string[];
};

export type EbosSyntheticScenarioStatusSummary = {
  status: "not_generated" | "generated";
  targetDate: string;
  synthetic: boolean;
  simulated: boolean;
  scenarioPath?: string;
  analysisPath?: string;
  optimizationPlanPath?: string;
  optimizationImplementationPath?: string;
  optimizationImplementationCompleted?: boolean;
  simulatedRevenue: number;
  simulatedPaidOrders: number;
  likelyFailureReasonsCount: number;
  priorityFixesCount: number;
  nextExperimentActionsCount: number;
  implementedFixesCount?: number;
  nextRealValidationActionsCount?: number;
  warnings: string[];
  summary: string;
};
