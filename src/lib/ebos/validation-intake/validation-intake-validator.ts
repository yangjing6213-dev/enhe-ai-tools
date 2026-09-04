import {
  hasExternalIntakeRecordSignal,
  normalizeExternalChannelRecord,
  normalizeExternalIntakeInput
} from "./validation-intake-reader";
import type {
  EbosExternalChannelIntakeInput,
  EbosExternalChannelRecord,
  EbosExternalIntakeCompleteness,
  EbosExternalIntakeCompletenessLevel,
  EbosExternalIntakeValidationResult,
  EbosExternalIntakeWarning
} from "./validation-intake-types";

const NUMERIC_FIELDS = [
  "views",
  "clicks",
  "favorites",
  "saves",
  "shares",
  "messages",
  "leads",
  "positiveReplies",
  "negativeReplies",
  "orders",
  "paidOrders",
  "revenue",
  "refundCount",
  "refundedAmount"
] as const;

export function validateExternalIntakeInput(input: unknown): EbosExternalIntakeValidationResult {
  const normalized = normalizeExternalIntakeInput(input);
  const warnings = normalized.planResults.flatMap((record) => validateExternalChannelRecord(record).warnings);
  const completeness = summarizeExternalIntakeCompleteness(normalized);

  return {
    isValid: true,
    input: normalized,
    warnings,
    completeness
  };
}

export function validateExternalChannelRecord(record: unknown) {
  const normalized = normalizeExternalChannelRecord(record);
  const raw = toRecord(record);
  const warnings: EbosExternalIntakeWarning[] = [];
  const planId = normalized?.targetPlanId ?? readString(raw.targetPlanId) ?? readString(raw.planId);

  if (!normalized) {
    return {
      isValid: true,
      warnings: [issue(
        "external_intake_plan_id_missing",
        "warning",
        "External intake record is missing targetPlanId.",
        undefined,
        "targetPlanId"
      )]
    };
  }

  for (const field of NUMERIC_FIELDS) {
    const value = readNumber(raw[field]);
    if (value !== undefined && value < 0) {
      warnings.push(issue(
        "external_intake_negative_number",
        "warning",
        `External intake numeric field ${field} cannot be negative.`,
        planId,
        field
      ));
    }
  }

  if (Array.isArray(raw.userFeedback) === false && raw.userFeedback !== undefined && typeof raw.userFeedback !== "string") {
    warnings.push(issue(
      "external_intake_user_feedback_not_array",
      "warning",
      "userFeedback should be an array of real user feedback strings.",
      planId,
      "userFeedback"
    ));
  }

  const views = normalized.views ?? 0;
  const clicks = normalized.clicks ?? 0;
  const messages = normalized.messages ?? 0;
  const leads = normalized.leads ?? 0;
  const orders = normalized.orders ?? 0;
  const paidOrders = normalized.paidOrders ?? 0;
  const revenue = normalized.revenue ?? 0;
  const refundCount = normalized.refundCount ?? 0;
  const refundedAmount = normalized.refundedAmount ?? 0;

  if (clicks > views) {
    warnings.push(issue("external_intake_clicks_exceed_views", "warning", "clicks is greater than views.", planId, "clicks"));
  }
  if (messages > views) {
    warnings.push(issue("external_intake_messages_exceed_views", "warning", "messages is greater than views.", planId, "messages"));
  }
  if (leads > messages + clicks) {
    warnings.push(issue("external_intake_leads_exceed_messages_and_clicks", "warning", "leads is greater than messages + clicks.", planId, "leads"));
  }
  if (paidOrders > orders && orders > 0) {
    warnings.push(issue("external_intake_paid_orders_exceed_orders", "warning", "paidOrders is greater than orders.", planId, "paidOrders"));
  }
  if (refundCount > paidOrders) {
    warnings.push(issue("external_intake_refunds_exceed_paid_orders", "warning", "refundCount is greater than paidOrders.", planId, "refundCount"));
  }
  if (revenue > 0 && paidOrders === 0) {
    warnings.push(issue("external_intake_revenue_without_paid_orders", "warning", "revenue is recorded but paidOrders is 0.", planId, "revenue"));
  }
  if (refundedAmount > revenue) {
    warnings.push(issue("external_intake_refunded_amount_exceeds_revenue", "warning", "refundedAmount is greater than revenue.", planId, "refundedAmount"));
  }

  return {
    isValid: true,
    warnings
  };
}

export function summarizeExternalIntakeCompleteness(input: EbosExternalChannelIntakeInput): EbosExternalIntakeCompleteness {
  const records = input.planResults ?? [];
  const signalRecords = records.filter(hasExternalIntakeRecordSignal);
  const plans = unique(records.map((record) => record.targetPlanId));
  const signalPlans = unique(signalRecords.map((record) => record.targetPlanId));
  const completenessPercent = records.length
    ? Math.round((signalRecords.length / records.length) * 100)
    : 0;

  return {
    totalRecords: records.length,
    recordsWithAnySignal: signalRecords.length,
    totalPlans: plans.length,
    plansWithAnySignal: signalPlans.length,
    completenessPercent,
    level: completenessLevel(completenessPercent)
  };
}

function completenessLevel(percent: number): EbosExternalIntakeCompletenessLevel {
  if (percent <= 0) return "empty";
  if (percent <= 50) return "low";
  if (percent < 80) return "medium";
  return "high";
}

function issue(
  code: string,
  severity: EbosExternalIntakeWarning["severity"],
  message: string,
  planId?: string,
  field?: string
): EbosExternalIntakeWarning {
  return {
    code,
    severity,
    message,
    ...(planId ? { planId } : {}),
    ...(field ? { field, source: field } : {})
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
