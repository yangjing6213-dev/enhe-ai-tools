import type { EbosValidationWarning } from "../validation";

export type EbosExternalChannel =
  | "xianyu"
  | "taobao"
  | "whop"
  | "xiaohongshu"
  | "douyin"
  | "wechat"
  | "email"
  | "manual_outreach"
  | "other";

export type EbosExternalChannelRecord = {
  channel: EbosExternalChannel;
  targetPlanId: string;
  targetProductOrDirection?: string;
  url?: string;
  views?: number;
  clicks?: number;
  favorites?: number;
  saves?: number;
  shares?: number;
  messages?: number;
  leads?: number;
  positiveReplies?: number;
  negativeReplies?: number;
  orders?: number;
  paidOrders?: number;
  revenue?: number;
  refundCount?: number;
  refundedAmount?: number;
  userFeedback?: string[];
  notes?: string;
};

export type EbosExternalIntakePlanField = {
  planId: string;
  targetProductOrDirection?: string;
  notes?: string;
  manualFields: string[];
  manualSlots: {
    field: string;
    label: string;
    description: string;
    sourceHint: string;
    requiredForDecision: boolean;
  }[];
};

export type EbosExternalChannelIntakeTemplate = {
  templateType: "external_channel_intake_template";
  targetDate: string;
  generatedAt: string;
  sourceCaptureReportPath?: string;
  sourceValidationInputPath?: string;
  channels: EbosExternalChannel[];
  planFields: EbosExternalIntakePlanField[];
  instructions: string[];
  warnings: string[];
};

export type EbosExternalChannelIntakeInput = {
  inputType: "external_channel_intake_input";
  targetDate: string;
  filledAt?: string;
  channels: EbosExternalChannel[];
  planResults: EbosExternalChannelRecord[];
  notes: string[];
  warnings?: EbosExternalIntakeWarning[];
};

export type EbosExternalIntakeWarning = EbosValidationWarning & {
  field?: string;
};

export type EbosExternalIntakeChange = {
  planId: string;
  field: string;
  channel?: EbosExternalChannel;
  oldValue?: unknown;
  newValue?: unknown;
  reason: string;
};

export type EbosExternalIntakeImportResult = {
  targetDate: string;
  inputPath: string;
  validationInputPath: string;
  backupPath?: string;
  importReportJsonPath?: string;
  importReportMarkdownPath?: string;
  dryRun: boolean;
  appliedChanges: EbosExternalIntakeChange[];
  skippedChanges: EbosExternalIntakeChange[];
  validationWarnings: EbosExternalIntakeWarning[];
  dataQualityWarnings: EbosExternalIntakeWarning[];
  importedChannelsCount: number;
  importedPlansCount: number;
  summary: string;
};

export type EbosExternalIntakeCompletenessLevel = "empty" | "low" | "medium" | "high";

export type EbosExternalIntakeCompleteness = {
  totalRecords: number;
  recordsWithAnySignal: number;
  totalPlans: number;
  plansWithAnySignal: number;
  completenessPercent: number;
  level: EbosExternalIntakeCompletenessLevel;
};

export type EbosExternalIntakeReadResult = {
  input: EbosExternalChannelIntakeInput;
  warnings: EbosExternalIntakeWarning[];
};

export type EbosExternalIntakeValidationResult = {
  isValid: boolean;
  input: EbosExternalChannelIntakeInput;
  warnings: EbosExternalIntakeWarning[];
  completeness: EbosExternalIntakeCompleteness;
};

export type EbosExternalIntakeStatus =
  | "not_generated"
  | "template_generated_unfilled"
  | "input_filled_not_imported"
  | "dry_run_available"
  | "imported";

export type EbosExternalIntakeStatusSummary = {
  status: EbosExternalIntakeStatus;
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
