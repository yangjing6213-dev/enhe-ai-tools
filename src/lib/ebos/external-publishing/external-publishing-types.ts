import type { EbosExternalChannel, EbosExternalChannelIntakeInput } from "../validation-intake";

export type EbosExternalPublishingChannel =
  | "xianyu"
  | "taobao"
  | "whop"
  | "xiaohongshu"
  | "wechat"
  | "manual_outreach"
  | "other";

export type EbosExternalPublishingPack = {
  packType: "external_channel_publishing_pack";
  targetDate: string;
  generatedAt: string;
  verifiedLandingPages: string[];
  channels: EbosExternalPublishingChannel[];
  publishAssets: EbosExternalChannelPublishAsset[];
  trackingFields: Record<EbosExternalPublishingChannel, string[]>;
  userMinimumActions: string[];
  codexAllowedActions: string[];
  safetyWarnings: string[];
  nextCommands: string[];
};

export type EbosExternalChannelPublishAsset = {
  channel: EbosExternalPublishingChannel;
  targetProductOrDirection: string;
  language: "zh" | "en";
  title: string;
  shortDescription: string;
  longDescription: string;
  priceSuggestion?: string;
  urlToPromote: string;
  tags: string[];
  callToAction: string;
  complianceNotice: string;
  publishSteps: string[];
  dataFieldsToRecord: string[];
  userMinimumAction: string;
  warnings: string[];
};

export type EbosExternalPublishResultInput = {
  inputType: "external_publish_result_input";
  targetDate: string;
  filledAt?: string | null;
  channelResults: EbosExternalPublishChannelResult[];
  notes: string[];
  warnings: string[];
};

export type EbosExternalPublishChannelResult = {
  channel: EbosExternalPublishingChannel;
  published: boolean;
  publishedAt?: string | null;
  publishedUrl?: string | null;
  listingTitle?: string | null;
  views: number;
  clicks: number;
  favorites: number;
  saves: number;
  shares: number;
  messages: number;
  leads: number;
  positiveReplies: number;
  negativeReplies: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  refundCount: number;
  refundedAmount: number;
  userFeedback: string[];
  notes: string;
  evidence: string[];
  failures: string[];
};

export type EbosExternalPublishValidationResult = {
  valid: boolean;
  publishCoverage: number;
  dataCoverage: number;
  hasRealSignals: boolean;
  canBackfill: boolean;
  warnings: string[];
  blockers: string[];
};

export type EbosExternalDataBackfillReport = {
  reportType: "external_channel_data_backfill_report";
  targetDate: string;
  generatedAt: string;
  dryRun: boolean;
  applied: boolean;
  inputPath: string;
  externalIntakeInputPath: string;
  backupPath?: string;
  validation: EbosExternalPublishValidationResult;
  mappedInput: EbosExternalChannelIntakeInput;
  mergedInput: EbosExternalChannelIntakeInput;
  mappedRecordsCount: number;
  mergedRecordsCount: number;
  warnings: string[];
  blockers: string[];
  summary: string;
};

export type EbosExternalPublishingStatus =
  | "not_generated"
  | "pack_generated"
  | "result_input_waiting"
  | "waiting_real_data"
  | "ready_to_backfill"
  | "backfill_dry_run"
  | "backfilled"
  | "blocked";

export type EbosExternalPublishingStatusSummary = {
  status: EbosExternalPublishingStatus;
  packPath?: string;
  resultInputPath?: string;
  backfillReportPath?: string;
  channelsCount: number;
  publishAssetsCount: number;
  publishCoverage: number;
  dataCoverage: number;
  hasRealSignals: boolean;
  canBackfill: boolean;
  warnings: string[];
  blockers: string[];
  summary: string;
};

export type EbosExternalPublishingWriteResult = {
  filePath: string;
  written: boolean;
  skippedReason?: string;
  input: EbosExternalPublishResultInput;
};

export function toValidationIntakeChannel(channel: EbosExternalPublishingChannel): EbosExternalChannel {
  return channel === "other" ? "other" : channel;
}
