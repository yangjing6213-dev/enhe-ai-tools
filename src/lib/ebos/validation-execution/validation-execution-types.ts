import type { EbosValidationMethod } from "../decision";
import type {
  EbosValidationResultInput,
  EbosValidationResultStatus,
  EbosValidationWarning
} from "../validation";

export type EbosValidationChannel =
  | "website"
  | "whop"
  | "taobao"
  | "xianyu"
  | "xiaohongshu"
  | "douyin"
  | "wechat"
  | "manual_outreach"
  | "email"
  | "other";

export type EbosValidationMetricField = {
  key: string;
  label: string;
  type: "number" | "string" | "boolean" | "string_array";
  required: boolean;
  description: string;
  example?: string | number | boolean | string[];
};

export type EbosValidationChannelTracking = {
  channel: EbosValidationChannel;
  plannedAction: string;
  targetUrl?: string;
  metricFields: EbosValidationMetricField[];
  notes: string;
};

export type EbosValidationExecutionResultInputTemplate =
  EbosValidationResultInput & Record<string, string | number | boolean | string[] | undefined>;

export type EbosValidationExecutionPlan = {
  planId: string;
  title: string;
  targetDirection: string;
  targetProduct?: string;
  validationMethod: EbosValidationMethod;
  objective: string;
  hypothesis: string;
  successMetric: string;
  minimumSuccessThreshold: string;
  durationDays: number;
  executionStatus: EbosValidationResultStatus;
  landingPageUrl?: string;
  marketplaceListingUrls?: string[];
  contentTestUrls?: string[];
  outreachTargets?: string[];
  trackingFields: EbosValidationMetricField[];
  codexTasks: string[];
  humanTasks: string[];
  acceptanceCriteria: string[];
  resultInputTemplate: EbosValidationExecutionResultInputTemplate;
};

export type EbosValidationExecutionInput = {
  inputType: "validation_execution_input";
  targetDate: string;
  generatedAt: string;
  decisionReportPath: string;
  validationTrackerPath: string;
  validationResultInputPath: string;
  executionPlans: EbosValidationExecutionPlan[];
  channelTracking: EbosValidationChannelTracking[];
  resultRecordingRules: string[];
  weeklyReviewQuestions: string[];
  warnings: EbosValidationWarning[];
};

export type EbosValidationExecutionChecklistItem = {
  id: string;
  title: string;
  owner: "codex" | "human";
  acceptanceCriteria: string[];
  notes?: string;
};

export type EbosValidationExecutionChecklist = {
  codex: EbosValidationExecutionChecklistItem[];
  human: EbosValidationExecutionChecklistItem[];
};

export type EbosValidationExecutionThresholds = {
  partialSuccess: string[];
  success: string[];
  scaleOrContinue: string[];
  failure: string[];
};

export type EbosValidationExecutionDecisionRule = {
  partialSuccess: string;
  success: string;
  scaleOrContinue: string;
  failure: string;
};
