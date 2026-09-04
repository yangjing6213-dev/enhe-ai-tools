import type {
  EbosValidationAnalysis,
  EbosValidationDecisionRecommendation,
  EbosValidationInputFile,
  EbosValidationPlanTracker,
  EbosValidationResultInput,
  EbosValidationResultReport,
  EbosValidationSuccessStatus,
  EbosValidationTracker
} from "./validation-types";
import { normalizeValidationResultInput } from "./validation-result-reader";
import { attributeValidationResultsByChannel } from "./validation-channel-attribution";
import {
  summarizeValidationInputCompleteness,
  validateSinglePlanResult
} from "./validation-input-validator";

export function analyzeValidationResults(
  tracker: EbosValidationTracker,
  input: EbosValidationInputFile | unknown,
  options: {
    trackerPath?: string;
    inputPath?: string;
    generatedAt?: string | Date;
  } = {}
): EbosValidationResultReport {
  const normalized = normalizeValidationResultInput(input);
  const resultsByPlanId = new Map(normalized.results.map((result) => [result.planId, result]));
  const analyses = tracker.validationPlans.map((plan) => analyzeSingleValidationPlan(
    plan,
    resultsByPlanId.get(plan.id) ?? plan.resultInput
  ));
  const overallValidationScore = analyses.length
    ? Math.round(analyses.reduce((total, analysis) => total + analysis.score, 0) / analyses.length)
    : 0;

  return {
    reportType: "validation_result_report",
    targetDate: tracker.targetDate,
    generatedAt: toIsoString(options.generatedAt ?? new Date()),
    trackerPath: options.trackerPath ?? normalized.trackerPath ?? tracker.decisionReportPath,
    ...(options.inputPath ? { inputPath: options.inputPath } : {}),
    analyses,
    overallValidationScore,
    summary: buildSummary(analyses, overallValidationScore),
    continueDirections: directionsFor(analyses, "continue"),
    adjustDirections: directionsFor(analyses, "adjust"),
    stopDirections: directionsFor(analyses, "stop"),
    scaleDirections: directionsFor(analyses, "scale"),
    codexTasks: uniqueTasks(tracker.validationPlans.flatMap((plan) => plan.codexTasks)),
    humanTasks: uniqueTasks(tracker.validationPlans.flatMap((plan) => plan.humanTasks)),
    warnings: [
      ...tracker.warnings.map((warning) => warning.message),
      ...(normalized.warnings ?? []).map((warning) => warning.message),
      ...analyses.flatMap((analysis) => analysis.warnings)
    ]
  };
}

export function analyzeSingleValidationPlan(
  plan: EbosValidationPlanTracker,
  result: EbosValidationResultInput
): EbosValidationAnalysis {
  const normalizedResult = {
    ...plan.resultInput,
    ...result,
    planId: plan.id
  };
  const score = calculateValidationScore(plan, normalizedResult);
  const successStatus = calculateSuccessStatus(plan, normalizedResult, score);
  const decisionRecommendation = getDecisionRecommendation(successStatus, normalizedResult);
  const validation = validateSinglePlanResult(normalizedResult);
  const channelAttributionSummary = attributeValidationResultsByChannel(normalizedResult);
  const inputCompleteness = summarizeValidationInputCompleteness({ results: [normalizedResult] });
  const dataQualityWarnings = [
    ...validation.errors,
    ...validation.warnings.filter((warning) => warning.severity !== "info")
  ].map((warning) => warning.message);
  const warnings = uniqueTasks([
    ...buildWarnings(normalizedResult),
    ...dataQualityWarnings
  ]);

  return {
    planId: plan.id,
    title: plan.title,
    targetDirection: plan.targetDirection,
    ...(plan.targetProduct ? { targetProduct: plan.targetProduct } : {}),
    status: normalizedResult.status,
    successStatus,
    score,
    resultInput: normalizedResult,
    evidenceSummary: buildEvidenceSummary(normalizedResult, successStatus),
    channelAttributionSummary,
    inputCompleteness,
    dataQualityWarnings,
    decisionRecommendation,
    reason: buildReason(successStatus, decisionRecommendation, normalizedResult),
    nextActions: buildNextActions(plan, decisionRecommendation, normalizedResult, channelAttributionSummary.recommendations),
    risks: plan.risks,
    warnings
  };
}

export function calculateValidationScore(
  plan: EbosValidationPlanTracker,
  result: EbosValidationResultInput
) {
  if (isEffectivelyEmptyResult(result)) return 0;
  if (result.status === "not_started" || result.status === "skipped") return 0;
  if (hasAnyRefundOnPaidOrder(result)) return 55;
  if (hasPaidOrdersWithoutRefunds(result)) return result.paidOrders && result.paidOrders > 1 ? 95 : 88;
  if ((result.presaleOrders ?? 0) >= 1 || (result.paidOrders ?? 0) >= 1) return 85;
  if (hasProductPageClicksWithoutLeads(result)) return 45;
  if (meetsExplicitThreshold(plan, result)) return 80;
  if (hasMarketplaceMessagesWithoutOrders(result) || hasEngagementWithoutOrders(result)) return 55;
  if (hasPositiveFeedback(result)) return 50;
  if (result.status === "running") return 15;
  if (result.status === "completed") return 15;
  return 0;
}

function calculateSuccessStatus(
  plan: EbosValidationPlanTracker,
  result: EbosValidationResultInput,
  score: number
): EbosValidationSuccessStatus {
  if (isEffectivelyEmptyResult(result)) return "not_started";
  if (result.status === "not_started") return "not_started";
  if (result.status === "skipped") return "inconclusive";
  if (hasAnyRefundOnPaidOrder(result)) return "partial_success";
  if (hasPaidOrdersWithoutRefunds(result)) return "success";
  if ((result.presaleOrders ?? 0) >= 1 || (result.paidOrders ?? 0) >= 1) return "success";
  if (hasProductPageClicksWithoutLeads(result)) return "inconclusive";
  if (hasMarketplaceMessagesWithoutOrders(result)) return "partial_success";
  if (meetsExplicitThreshold(plan, result)) return "success";
  if (hasEngagementWithoutOrders(result) || hasPositiveFeedback(result)) return "partial_success";
  if (result.status === "running") return "inconclusive";
  return score > 0 ? "failed" : "inconclusive";
}

function getDecisionRecommendation(
  successStatus: EbosValidationSuccessStatus,
  result: EbosValidationResultInput
): EbosValidationDecisionRecommendation {
  if (successStatus === "success") {
    return hasPaidOrdersWithoutRefunds(result) && ((result.paidOrders ?? 0) > 1 || (result.revenue ?? 0) > 0)
      ? "scale"
      : "continue";
  }
  if (successStatus === "partial_success") return "adjust";
  if (successStatus === "inconclusive" && hasAnyRecordedSignal(result)) return "adjust";
  if (successStatus === "failed") return hasAnyRecordedSignal(result) ? "adjust" : "stop";
  return "needs_more_data";
}

function buildEvidenceSummary(
  result: EbosValidationResultInput,
  successStatus: EbosValidationSuccessStatus
) {
  const summary: string[] = [];
  addMetric(summary, "Actual metric", result.actualMetricValue, result.actualMetricLabel);
  addMetric(summary, "Page views", result.pageViews);
  addMetric(summary, "Product page views", result.productPageViews);
  addMetric(summary, "Product page CTA clicks", result.productPageCtaClicks);
  addMetric(summary, "Listing views", result.listingViews);
  addMetric(summary, "Marketplace clicks", result.clicks);
  addMetric(summary, "Favorites", result.favorites);
  addMetric(summary, "Messages", result.messages);
  addMetric(summary, "Orders", result.orders);
  addMetric(summary, "Conversion rate", result.conversionRate);
  addMetric(summary, "CTA clicks", result.ctaClicks);
  addMetric(summary, "Leads", result.leads);
  addMetric(summary, "Presale orders", result.presaleOrders);
  addMetric(summary, "Paid orders", result.paidOrders);
  addMetric(summary, "Revenue", result.revenue);
  addMetric(summary, "Refund count", result.refundCount);
  addMetric(summary, "Manual outreach", result.manualOutreachCount);
  addMetric(summary, "Outreach count", result.outreachCount);
  addMetric(summary, "Positive replies", result.positiveReplies);
  addMetric(summary, "Negative replies", result.negativeReplies);
  addMetric(summary, "Calls booked", result.callsBooked);
  addMetric(summary, "Support questions", result.supportQuestions);

  if (result.priceShown) {
    summary.push(`Price shown: ${result.priceShown}`);
  }
  addStringArray(summary, "Feedback", result.feedback);
  addStringArray(summary, "Buyer feedback", result.buyerFeedback);
  addStringArray(summary, "Delivery feedback", result.deliveryFeedback);
  if (result.userFeedback?.length) {
    summary.push(`User feedback: ${result.userFeedback.join(" | ")}`);
  }
  if (result.channelResults?.length) {
    summary.push(`Channel results recorded: ${result.channelResults.length}`);
  }
  if (result.notes) {
    summary.push(`Notes: ${result.notes}`);
  }
  if (summary.length === 0 && (successStatus === "not_started" || successStatus === "inconclusive")) {
    summary.push("尚未开始或尚未记录结果");
  }
  if (summary.length === 0) {
    summary.push("No recorded validation metrics.");
  }
  return summary;
}

function buildReason(
  successStatus: EbosValidationSuccessStatus,
  recommendation: EbosValidationDecisionRecommendation,
  result: EbosValidationResultInput
) {
  if (successStatus === "not_started") return "No result input was recorded.";
  if (successStatus === "success" && recommendation === "scale") return "Revenue or paid orders were recorded with no refund issue.";
  if (successStatus === "success") return "The plan reached its order or threshold signal.";
  if (successStatus === "partial_success" && hasAnyRefundOnPaidOrder(result)) return "Paid orders exist, but refunds require reason analysis before calling it a clean success.";
  if (successStatus === "partial_success" && hasMarketplaceMessagesWithoutOrders(result)) return "Marketplace produced buyer messages but no orders, so the offer needs adjustment.";
  if (successStatus === "partial_success") return "The plan produced intent signals but not enough clean purchase evidence.";
  if (successStatus === "inconclusive" && hasProductPageClicksWithoutLeads(result)) return "Product page CTA clicks were recorded, but no leads were recorded.";
  if (successStatus === "failed") return "The plan was completed without enough recorded demand signals.";
  return "The result is incomplete, so EBOS needs more data before changing direction.";
}

function buildNextActions(
  plan: EbosValidationPlanTracker,
  recommendation: EbosValidationDecisionRecommendation,
  result: EbosValidationResultInput,
  channelRecommendations: string[] = []
) {
  if (hasAnyRefundOnPaidOrder(result)) {
    return uniqueTasks([
      "Analyze refund reasons before scaling the offer.",
      "Review delivery expectation, product description, and support questions.",
      ...channelRecommendations,
      ...plan.codexTasks.slice(0, 2)
    ]);
  }
  if (hasProductPageClicksWithoutLeads(result)) {
    return uniqueTasks([
      "Optimize consultation entry, lead capture, offer clarity, price framing, and trust elements.",
      ...channelRecommendations,
      ...plan.codexTasks.slice(0, 2)
    ]);
  }
  if (recommendation === "scale") return [
    `Scale the validated offer for ${plan.targetDirection}.`,
    ...plan.codexTasks.slice(0, 2)
  ];
  if (recommendation === "continue") return [
    `Continue validation for ${plan.targetDirection} and collect repeatable conversion evidence.`,
    ...plan.codexTasks.slice(0, 2)
  ];
  if (recommendation === "adjust") return [
    `Adjust offer, price, CTA, or channel for ${plan.targetDirection}.`,
    ...channelRecommendations.slice(0, 2),
    ...plan.codexTasks.slice(0, 2)
  ];
  if (recommendation === "stop") return [
    `Stop or pause ${plan.targetDirection} until a stronger signal appears.`
  ];
  return [
    "Record CTA clicks, leads, orders, revenue, feedback, and notes before making the next decision."
  ];
}

function buildWarnings(result: EbosValidationResultInput) {
  const warnings: string[] = [];
  if (hasAnyRefundOnPaidOrder(result)) {
    warnings.push("Refund risk: paid orders exist, but refund count is greater than 0.");
  }
  if (result.status === "completed" && !hasAnyRecordedSignal(result)) {
    warnings.push("Completed result has no recorded clicks, leads, orders, revenue, replies, or feedback.");
  }
  return warnings;
}

function buildSummary(analyses: EbosValidationAnalysis[], overallValidationScore: number) {
  if (analyses.length === 0) return "No validation plans were available.";
  const counts = countStatuses(analyses);
  if (counts.not_started === analyses.length) {
    return "尚未开始或尚未记录结果。";
  }
  return `Validation score ${overallValidationScore}. success=${counts.success}, partial_success=${counts.partial_success}, failed=${counts.failed}, inconclusive=${counts.inconclusive}, not_started=${counts.not_started}.`;
}

function countStatuses(analyses: EbosValidationAnalysis[]) {
  return analyses.reduce((counts, analysis) => {
    counts[analysis.successStatus] += 1;
    return counts;
  }, {
    success: 0,
    partial_success: 0,
    failed: 0,
    inconclusive: 0,
    not_started: 0
  });
}

function directionsFor(
  analyses: EbosValidationAnalysis[],
  recommendation: EbosValidationDecisionRecommendation
) {
  return uniqueTasks(analyses
    .filter((analysis) => analysis.decisionRecommendation === recommendation)
    .map((analysis) => analysis.targetProduct ?? analysis.targetDirection));
}

function uniqueTasks(tasks: string[]) {
  return [...new Set(tasks.filter(Boolean))];
}

function addMetric(summary: string[], label: string, value?: number, metricLabel?: string) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    summary.push(`${label}${metricLabel ? ` (${metricLabel})` : ""}: ${value}`);
  }
}

function addStringArray(summary: string[], label: string, value?: string[]) {
  if (value?.length) {
    summary.push(`${label}: ${value.join(" | ")}`);
  }
}

function hasAnyRefundOnPaidOrder(result: EbosValidationResultInput) {
  const paidOrders = result.paidOrders ?? 0;
  const refundCount = result.refundCount ?? 0;
  return paidOrders > 0 && refundCount > 0;
}

function hasPaidOrdersWithoutRefunds(result: EbosValidationResultInput) {
  return (result.paidOrders ?? 0) > 0 && (result.refundCount ?? 0) === 0;
}

function hasProductPageClicksWithoutLeads(result: EbosValidationResultInput) {
  return (result.productPageCtaClicks ?? 0) >= 10
    && (result.leads ?? 0) === 0
    && (result.presaleOrders ?? 0) === 0
    && (result.paidOrders ?? 0) === 0;
}

function hasMarketplaceMessagesWithoutOrders(result: EbosValidationResultInput) {
  return (result.messages ?? 0) > 0
    && (result.orders ?? 0) === 0
    && (result.presaleOrders ?? 0) === 0
    && (result.paidOrders ?? 0) === 0;
}

function hasEngagementWithoutOrders(result: EbosValidationResultInput) {
  return ((result.ctaClicks ?? 0) > 0
    || (result.leads ?? 0) > 0
    || (result.productPageCtaClicks ?? 0) > 0
    || (result.clicks ?? 0) > 0
    || (result.favorites ?? 0) > 0
    || (result.positiveReplies ?? 0) > 0
    || (result.callsBooked ?? 0) > 0)
    && (result.presaleOrders ?? 0) === 0
    && (result.paidOrders ?? 0) === 0;
}

function hasPositiveFeedback(result: EbosValidationResultInput) {
  return Boolean(result.userFeedback?.some((item) => item.trim().length > 0))
    || Boolean(result.feedback?.some((item) => item.trim().length > 0))
    || Boolean(result.buyerFeedback?.some((item) => item.trim().length > 0))
    || Boolean(result.deliveryFeedback?.some((item) => item.trim().length > 0))
    || (result.positiveReplies ?? 0) > 0;
}

function isEffectivelyEmptyResult(result: EbosValidationResultInput) {
  return !hasAnyRecordedSignal(result);
}

function hasAnyRecordedSignal(result: EbosValidationResultInput) {
  return [
    result.actualMetricValue,
    result.pageViews,
    result.productPageViews,
    result.productPageCtaClicks,
    result.listingViews,
    result.clicks,
    result.favorites,
    result.messages,
    result.orders,
    result.conversionRate,
    result.ctaClicks,
    result.leads,
    result.presaleOrders,
    result.paidOrders,
    result.revenue,
    result.refundCount,
    result.manualOutreachCount,
    result.outreachCount,
    result.positiveReplies,
    result.negativeReplies,
    result.callsBooked,
    result.contentViews,
    result.comments,
    result.saves,
    result.shares,
    result.supportQuestions
  ].some((value) => typeof value === "number" && value > 0)
    || hasFilledString(result.priceShown)
    || hasFilledString(result.notes)
    || hasFilledStringArray(result.feedback)
    || hasFilledStringArray(result.buyerFeedback)
    || hasFilledStringArray(result.deliveryFeedback)
    || hasFilledStringArray(result.userFeedback)
    || Boolean(result.channelResults?.length);
}

function hasFilledString(value?: string) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasFilledStringArray(value?: string[]) {
  return Boolean(value?.some((item) => item.trim().length > 0));
}

function meetsExplicitThreshold(
  plan: EbosValidationPlanTracker,
  result: EbosValidationResultInput
) {
  const ctaThreshold = readThreshold(plan.minimumSuccessThreshold, "cta");
  const leadsThreshold = readThreshold(plan.minimumSuccessThreshold, "lead");
  const metricThreshold = readThreshold(plan.minimumSuccessThreshold, result.actualMetricLabel ?? "");

  if (ctaThreshold !== null && (result.ctaClicks ?? 0) >= ctaThreshold) return true;
  if (leadsThreshold !== null && (result.leads ?? 0) >= leadsThreshold) return true;
  if (typeof result.actualMetricValue === "number") {
    const threshold = metricThreshold ?? firstThreshold(plan.minimumSuccessThreshold);
    return threshold !== null && result.actualMetricValue >= threshold;
  }
  return false;
}

function readThreshold(source: string, label: string) {
  const normalizedLabel = label.toLowerCase();
  const patterns = normalizedLabel.includes("lead")
    ? [/leads?\s*>=\s*(\d+(?:\.\d+)?)/i]
    : normalizedLabel.includes("cta") || normalizedLabel.includes("click")
      ? [/cta\s*clicks?\s*>=\s*(\d+(?:\.\d+)?)/i, /clicks?\s*>=\s*(\d+(?:\.\d+)?)/i]
      : normalizedLabel
        ? [new RegExp(`${escapeRegExp(normalizedLabel)}[^\\d>]*>=\\s*(\\d+(?:\\.\\d+)?)`, "i")]
        : [];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

function firstThreshold(source: string) {
  const match = source.match(/>=\s*(\d+(?:\.\d+)?)/);
  return match?.[1] ? Number(match[1]) : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
