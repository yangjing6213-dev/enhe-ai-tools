import type {
  EbosValidationInputCompleteness,
  EbosValidationInputCompletenessLevel,
  EbosValidationResultStatus,
  EbosValidationWarning
} from "./validation-types";

export type EbosValidationInputValidationResult = {
  isValid: boolean;
  errors: EbosValidationWarning[];
  warnings: EbosValidationWarning[];
};

const VALID_STATUSES = new Set<EbosValidationResultStatus>([
  "not_started",
  "running",
  "completed",
  "skipped"
]);

const NUMERIC_FIELDS = [
  "actualMetricValue",
  "pageViews",
  "productPageViews",
  "productPageCtaClicks",
  "listingViews",
  "clicks",
  "favorites",
  "messages",
  "orders",
  "conversionRate",
  "ctaClicks",
  "leads",
  "presaleOrders",
  "paidOrders",
  "revenue",
  "refundCount",
  "manualOutreachCount",
  "outreachCount",
  "positiveReplies",
  "negativeReplies",
  "callsBooked",
  "contentViews",
  "comments",
  "saves",
  "shares",
  "supportQuestions"
] as const;

const TRACKABLE_METADATA_FIELDS = new Set([
  "planId",
  "status",
  "completedAt",
  "channelResults"
]);

const DEFAULT_SUGGESTED_FIELDS = [
  "pageViews",
  "ctaClicks",
  "leads",
  "listingViews",
  "messages",
  "paidOrders",
  "revenue",
  "refundCount",
  "notes"
];

export function validateValidationInput(input: unknown): EbosValidationInputValidationResult {
  const validations = readPlanResults(input).map(validateSinglePlanResult);
  const errors = validations.flatMap((validation) => validation.errors);

  return {
    isValid: errors.length === 0,
    errors,
    warnings: collectValidationInputWarnings(input)
  };
}

export function validateSinglePlanResult(result: unknown): EbosValidationInputValidationResult {
  const raw = toRecord(result);
  const errors: EbosValidationWarning[] = [];
  const planId = readPlanId(raw);

  if (!planId) {
    errors.push(issue("validation_plan_id_missing", "critical", "Validation result must include planId."));
  }

  if (!isValidStatus(raw.status)) {
    errors.push(issue(
      "validation_status_invalid",
      "critical",
      "Validation status must be one of not_started, running, completed, or skipped.",
      planId
    ));
  }

  for (const field of NUMERIC_FIELDS) {
    const value = readNumber(raw[field]);
    if (value !== undefined && value < 0) {
      errors.push(issue(
        "validation_negative_numeric_field",
        "critical",
        `Validation numeric field ${field} cannot be negative.`,
        planId,
        field
      ));
    }
  }

  const conversionRate = readNumber(raw.conversionRate);
  if (conversionRate !== undefined && conversionRate > 100) {
    errors.push(issue(
      "validation_conversion_rate_out_of_range",
      "critical",
      "conversionRate must be recorded either as 0-1 or 0-100.",
      planId,
      "conversionRate"
    ));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: collectSinglePlanWarnings(raw)
  };
}

export function collectValidationInputWarnings(input: unknown): EbosValidationWarning[] {
  return readPlanResults(input).flatMap((result) => collectSinglePlanWarnings(toRecord(result)));
}

export function summarizeValidationInputCompleteness(input: unknown): EbosValidationInputCompleteness {
  const results = readPlanResults(input).map(toRecord);
  const suggestedFieldsToFill: Record<string, string[]> = {};
  let totalTrackableFields = 0;
  let filledTrackableFields = 0;
  let completedPlans = 0;
  let plansWithAnySignal = 0;

  for (const result of results) {
    const planId = readPlanId(result) ?? "unknown_plan";
    const trackableFields = Object.keys(result).filter(isTrackableField);
    const effectiveTrackableFields = trackableFields.length ? trackableFields : DEFAULT_SUGGESTED_FIELDS;
    const missingFields = effectiveTrackableFields.filter((field) => !isFilledValue(result[field]));
    const filledCount = effectiveTrackableFields.length - missingFields.length;

    totalTrackableFields += effectiveTrackableFields.length;
    filledTrackableFields += filledCount;
    if (result.status === "completed") completedPlans += 1;
    if (effectiveTrackableFields.some((field) => isFilledValue(result[field]))) plansWithAnySignal += 1;
    suggestedFieldsToFill[planId] = missingFields;
  }

  const completenessPercent = totalTrackableFields
    ? Math.round((filledTrackableFields / totalTrackableFields) * 100)
    : 0;

  return {
    totalPlans: results.length,
    completedPlans,
    plansWithAnySignal,
    totalTrackableFields,
    filledTrackableFields,
    completenessPercent,
    level: getCompletenessLevel(completenessPercent),
    suggestedFieldsToFill
  };
}

function collectSinglePlanWarnings(raw: Record<string, unknown>): EbosValidationWarning[] {
  const planId = readPlanId(raw);
  const warnings: EbosValidationWarning[] = [];
  const pageViews = readNumber(raw.pageViews);
  const ctaClicks = readNumber(raw.ctaClicks);
  const leads = readNumber(raw.leads);
  const listingViews = readNumber(raw.listingViews);
  const messages = readNumber(raw.messages);
  const paidOrders = readNumber(raw.paidOrders);
  const revenue = readNumber(raw.revenue);
  const refundCount = readNumber(raw.refundCount);
  const conversionRate = readNumber(raw.conversionRate);

  if ((revenue ?? 0) > 0 && (paidOrders ?? 0) === 0) {
    warnings.push(issue(
      "validation_revenue_without_paid_orders",
      "warning",
      "Revenue is recorded but paidOrders is 0; verify whether orders were missed.",
      planId,
      "revenue"
    ));
  }
  if ((paidOrders ?? 0) > 0 && (revenue ?? 0) === 0) {
    warnings.push(issue(
      "validation_paid_orders_without_revenue",
      "warning",
      "paidOrders is recorded but revenue is 0; verify whether revenue was missed.",
      planId,
      "paidOrders"
    ));
  }
  if ((refundCount ?? 0) > (paidOrders ?? 0)) {
    warnings.push(issue(
      "validation_refunds_exceed_paid_orders",
      "warning",
      "refundCount is greater than paidOrders; verify order and refund records.",
      planId,
      "refundCount"
    ));
  }
  if ((leads ?? 0) > (ctaClicks ?? 0)) {
    warnings.push(issue(
      "validation_leads_exceed_cta_clicks",
      "warning",
      "leads is greater than ctaClicks; verify tracking source consistency.",
      planId,
      "leads"
    ));
  }
  if (pageViews !== undefined && (ctaClicks ?? 0) > pageViews) {
    warnings.push(issue(
      "validation_cta_clicks_exceed_page_views",
      "warning",
      "ctaClicks is greater than pageViews; verify page and CTA tracking.",
      planId,
      "ctaClicks"
    ));
  }
  if (listingViews !== undefined && (messages ?? 0) > listingViews) {
    warnings.push(issue(
      "validation_messages_exceed_listing_views",
      "warning",
      "messages is greater than listingViews; verify marketplace tracking.",
      planId,
      "messages"
    ));
  }
  if (conversionRate !== undefined && conversionRate > 0 && conversionRate <= 1) {
    warnings.push(issue(
      "validation_conversion_rate_fraction_scale",
      "info",
      "conversionRate is recorded on a 0-1 fractional scale.",
      planId,
      "conversionRate"
    ));
  } else if (conversionRate !== undefined && conversionRate > 1 && conversionRate <= 100) {
    warnings.push(issue(
      "validation_conversion_rate_percent_scale",
      "info",
      "conversionRate is recorded on a 0-100 percent scale.",
      planId,
      "conversionRate"
    ));
  }

  return warnings;
}

function readPlanResults(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  const raw = toRecord(input);
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.validationResults)) return raw.validationResults;
  if (Array.isArray(raw.resultInputs)) return raw.resultInputs;
  if ("planId" in raw || "status" in raw) return [raw];
  return [];
}

function isValidStatus(value: unknown): value is EbosValidationResultStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as EbosValidationResultStatus);
}

function isTrackableField(field: string) {
  return !TRACKABLE_METADATA_FIELDS.has(field);
}

function isFilledValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return false;
}

function getCompletenessLevel(percent: number): EbosValidationInputCompletenessLevel {
  if (percent <= 0) return "empty";
  if (percent < 40) return "low";
  if (percent < 80) return "medium";
  return "high";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readPlanId(raw: Record<string, unknown>) {
  return typeof raw.planId === "string" && raw.planId.trim().length > 0
    ? raw.planId
    : undefined;
}

function issue(
  code: string,
  severity: EbosValidationWarning["severity"],
  message: string,
  planId?: string,
  source?: string
): EbosValidationWarning {
  return {
    code,
    severity,
    message,
    ...(planId ? { planId } : {}),
    ...(source ? { source } : {})
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
