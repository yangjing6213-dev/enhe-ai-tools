import type {
  EbosValidationChannelResult,
  EbosValidationInputFile,
  EbosValidationResultInput
} from "../validation";
import { normalizeExternalIntakeInput } from "./validation-intake-reader";
import type {
  EbosExternalChannel,
  EbosExternalChannelIntakeInput,
  EbosExternalChannelRecord,
  EbosExternalIntakeChange
} from "./validation-intake-types";

export type EbosExternalIntakeMapResult = {
  validationInput: EbosValidationInputFile;
  appliedChanges: EbosExternalIntakeChange[];
  skippedChanges: EbosExternalIntakeChange[];
  importedChannelsCount: number;
  importedPlansCount: number;
};

const MARKETPLACE_CHANNELS = new Set<EbosExternalChannel>(["xianyu", "taobao", "whop"]);
const SOCIAL_CHANNELS = new Set<EbosExternalChannel>(["xiaohongshu", "douyin"]);
const OUTREACH_CHANNELS = new Set<EbosExternalChannel>(["wechat", "email", "manual_outreach"]);

export function mapExternalIntakeToValidationChanges(
  input: EbosExternalChannelIntakeInput,
  validationInput: EbosValidationInputFile,
  options: { force?: boolean } = {}
): EbosExternalIntakeMapResult {
  const normalizedInput = normalizeExternalIntakeInput(input);
  const nextInput = preserveExistingValidationMetrics(validationInput);
  const byPlan = new Map(nextInput.results.map((result) => [result.planId, result]));
  const appliedChanges: EbosExternalIntakeChange[] = [];
  const skippedChanges: EbosExternalIntakeChange[] = [];
  const importedChannels = new Set<EbosExternalChannel>();
  const importedPlans = new Set<string>();

  for (const record of normalizedInput.planResults) {
    const target = byPlan.get(record.targetPlanId);
    if (!target) {
      skippedChanges.push({
        planId: record.targetPlanId,
        field: "*",
        channel: record.channel,
        reason: `Validation plan ${record.targetPlanId} not found.`
      });
      continue;
    }

    const beforeCount = appliedChanges.length;
    applyRecordToPlan(record, target, appliedChanges, skippedChanges, options.force === true);
    if (appliedChanges.length > beforeCount) {
      importedChannels.add(record.channel);
      importedPlans.add(record.targetPlanId);
    }
  }

  return {
    validationInput: nextInput,
    appliedChanges,
    skippedChanges,
    importedChannelsCount: importedChannels.size,
    importedPlansCount: importedPlans.size
  };
}

export function mergeExternalChannelRecordsByPlan(records: EbosExternalChannelRecord[]) {
  return records.reduce<Record<string, EbosExternalChannelRecord[]>>((grouped, record) => {
    grouped[record.targetPlanId] = [...(grouped[record.targetPlanId] ?? []), record];
    return grouped;
  }, {});
}

export function preserveExistingValidationMetrics(validationInput: EbosValidationInputFile): EbosValidationInputFile {
  return JSON.parse(JSON.stringify(validationInput)) as EbosValidationInputFile;
}

function applyRecordToPlan(
  record: EbosExternalChannelRecord,
  target: EbosValidationResultInput,
  appliedChanges: EbosExternalIntakeChange[],
  skippedChanges: EbosExternalIntakeChange[],
  force: boolean
) {
  if (MARKETPLACE_CHANNELS.has(record.channel)) {
    applyNumber(target, "listingViews", record.views, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "clicks", record.clicks, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "messages", record.messages, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "paidOrders", firstPositive(record.paidOrders, record.orders), record, appliedChanges, skippedChanges, force);
    applyNumber(target, "revenue", record.revenue, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "refundCount", record.refundCount, record, appliedChanges, skippedChanges, force);
  } else if (SOCIAL_CHANNELS.has(record.channel)) {
    applyNumber(target, "contentViews", record.views, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "ctaClicks", record.clicks, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "saves", record.saves, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "shares", record.shares, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "leads", sumPositive(record.messages, record.leads), record, appliedChanges, skippedChanges, force);
  } else if (OUTREACH_CHANNELS.has(record.channel)) {
    applyNumber(target, "leads", record.messages, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "positiveReplies", record.positiveReplies, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "negativeReplies", record.negativeReplies, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "paidOrders", firstPositive(record.paidOrders, record.orders), record, appliedChanges, skippedChanges, force);
    applyNumber(target, "revenue", record.revenue, record, appliedChanges, skippedChanges, force);
  } else {
    applyNumber(target, "ctaClicks", record.clicks, record, appliedChanges, skippedChanges, force);
    applyNumber(target, "leads", sumPositive(record.messages, record.leads), record, appliedChanges, skippedChanges, force);
    applyNumber(target, "paidOrders", firstPositive(record.paidOrders, record.orders), record, appliedChanges, skippedChanges, force);
    applyNumber(target, "revenue", record.revenue, record, appliedChanges, skippedChanges, force);
  }

  mergeStringArray(target, "userFeedback", record.userFeedback, record, appliedChanges);
  mergeChannelResult(target, record, appliedChanges);
}

function applyNumber(
  target: EbosValidationResultInput,
  field: keyof EbosValidationResultInput,
  value: number | undefined,
  record: EbosExternalChannelRecord,
  appliedChanges: EbosExternalIntakeChange[],
  skippedChanges: EbosExternalIntakeChange[],
  force: boolean
) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
  const oldValue = target[field];
  const oldNumber = typeof oldValue === "number" && Number.isFinite(oldValue) ? oldValue : 0;

  if (!force && oldNumber > value) {
    skippedChanges.push({
      planId: record.targetPlanId,
      field: String(field),
      channel: record.channel,
      oldValue,
      newValue: value,
      reason: "Existing validation metric is higher; use --force to overwrite."
    });
    return;
  }

  if (!force && oldNumber === value) return;

  (target as Record<string, unknown>)[String(field)] = value;
  appliedChanges.push({
    planId: record.targetPlanId,
    field: String(field),
    channel: record.channel,
    oldValue,
    newValue: value,
    reason: force ? "Imported external intake with force." : "Imported external intake."
  });
}

function mergeStringArray(
  target: EbosValidationResultInput,
  field: "userFeedback",
  values: string[] | undefined,
  record: EbosExternalChannelRecord,
  appliedChanges: EbosExternalIntakeChange[]
) {
  const incoming = (values ?? []).filter((item) => item.trim().length > 0);
  if (incoming.length === 0) return;
  const existing = target[field] ?? [];
  const merged = unique([...existing, ...incoming]);
  if (merged.length === existing.length) return;
  target[field] = merged;
  appliedChanges.push({
    planId: record.targetPlanId,
    field,
    channel: record.channel,
    oldValue: existing,
    newValue: merged,
    reason: "Merged external user feedback."
  });
}

function mergeChannelResult(
  target: EbosValidationResultInput,
  record: EbosExternalChannelRecord,
  appliedChanges: EbosExternalIntakeChange[]
) {
  const channelResult = toChannelResult(record);
  if (!channelResult) return;
  const existing = target.channelResults ?? [];
  const duplicate = existing.some((item) => item.channel === channelResult.channel && item.notes === channelResult.notes);
  if (duplicate) return;
  target.channelResults = [...existing, channelResult];
  appliedChanges.push({
    planId: record.targetPlanId,
    field: "channelResults",
    channel: record.channel,
    oldValue: existing,
    newValue: target.channelResults,
    reason: "Merged external channel result."
  });
}

function toChannelResult(record: EbosExternalChannelRecord): EbosValidationChannelResult | null {
  const leads = sumPositive(record.messages, record.leads);
  const paidOrders = firstPositive(record.paidOrders, record.orders);
  const hasAnyMetric = [
    record.views,
    record.clicks,
    record.messages,
    record.leads,
    record.orders,
    record.paidOrders,
    record.revenue
  ].some((value) => typeof value === "number" && value > 0);
  if (!hasAnyMetric && !record.notes?.trim()) return null;

  return {
    channel: record.channel,
    metricLabel: "external_channel_intake",
    ...(record.views && record.views > 0 ? { metricValue: record.views } : {}),
    ...(record.clicks && record.clicks > 0 ? { ctaClicks: record.clicks } : {}),
    ...(leads > 0 ? { leads } : {}),
    ...(paidOrders ? { paidOrders } : {}),
    ...(record.revenue && record.revenue > 0 ? { revenue: record.revenue } : {}),
    ...(record.notes?.trim() ? { notes: record.notes.trim() } : {})
  };
}

function firstPositive(...values: Array<number | undefined>): number | undefined {
  return values.find((value) => typeof value === "number" && value > 0);
}

function sumPositive(...values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (typeof value === "number" && value > 0 ? value : 0), 0);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
