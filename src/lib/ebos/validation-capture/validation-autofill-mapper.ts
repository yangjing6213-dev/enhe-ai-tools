import type {
  EbosValidationInputFile,
  EbosValidationResultInput
} from "../validation";
import { mapAnalyticsSummaryToValidationMetrics } from "./validation-analytics-reader";
import { mapOrderSummaryToValidationPlans } from "./validation-order-reader";
import type {
  EbosValidationAutofillChange,
  EbosValidationCaptureReport,
  EbosValidationManualDataSlot
} from "./validation-capture-types";

const externalManualFields = [
  "listingViews",
  "messages",
  "favorites",
  "manualOutreachCount",
  "positiveReplies",
  "userFeedback",
  "channelResults"
] as const;

export function buildValidationAutofillChanges(options: {
  capture: EbosValidationCaptureReport;
  input: EbosValidationInputFile;
  force?: boolean;
}): EbosValidationAutofillChange[] {
  const changes: EbosValidationAutofillChange[] = [];
  const inputByPlan = new Map(options.input.results.map((result) => [result.planId, result]));
  const analyticsMetrics = mapAnalyticsSummaryToValidationMetrics(options.capture.analyticsSummary);
  const orderMetrics = mapOrderSummaryToValidationPlans(options.capture.orderSummary);

  for (const [planId, metrics] of Object.entries(analyticsMetrics)) {
    for (const [field, value] of Object.entries(metrics)) {
      pushNumericChange(changes, {
        planId,
        field,
        value,
        source: "analytics",
        confidence: "high",
        reason: `Captured from existing AnalyticsEvent records for ${field}.`,
        current: inputByPlan.get(planId),
        force: options.force
      });
    }
  }

  for (const [planId, metrics] of Object.entries(orderMetrics)) {
    pushNumericChange(changes, {
      planId,
      field: "paidOrders",
      value: metrics.paidOrders,
      source: "orders",
      confidence: "high",
      reason: "Captured from existing paid orders attributed to this validation plan.",
      current: inputByPlan.get(planId),
      force: options.force
    });
    pushNumericChange(changes, {
      planId,
      field: "revenue",
      value: metrics.revenue,
      source: "orders",
      confidence: "high",
      reason: "Captured from existing order amount attributed to this validation plan.",
      current: inputByPlan.get(planId),
      force: options.force
    });
    pushNumericChange(changes, {
      planId,
      field: "refundCount",
      value: metrics.refundCount,
      source: "orders",
      confidence: "high",
      reason: "Captured from existing refund records attributed to this validation plan.",
      current: inputByPlan.get(planId),
      force: options.force
    });
  }

  return changes;
}

export function mapCaptureToValidationInput(
  capture: EbosValidationCaptureReport,
  input: EbosValidationInputFile,
  options: { force?: boolean } = {}
): EbosValidationInputFile {
  const changes = buildValidationAutofillChanges({ capture, input, force: options.force });
  const cloned = preserveManualFields(input);

  for (const change of changes) {
    if (!change.applied) continue;
    const target = cloned.results.find((result) => result.planId === change.planId);
    if (!target) continue;
    (target as Record<string, unknown>)[change.field] = change.newValue;
  }

  return cloned;
}

export function preserveManualFields(input: EbosValidationInputFile): EbosValidationInputFile {
  return JSON.parse(JSON.stringify(input)) as EbosValidationInputFile;
}

export function createManualDataSlots(input: EbosValidationInputFile): EbosValidationManualDataSlot[] {
  return input.results.flatMap((result) => externalManualFields.map((field) => ({
    planId: result.planId,
    field,
    label: labelForManualField(field),
    description: descriptionForManualField(field),
    sourceHint: sourceHintForManualField(field),
    example: exampleForManualField(field),
    requiredForDecision: field === "messages" || field === "userFeedback" || field === "channelResults"
  })));
}

function pushNumericChange(
  changes: EbosValidationAutofillChange[],
  input: {
    planId: string;
    field: string;
    value: number;
    source: EbosValidationAutofillChange["source"];
    confidence: EbosValidationAutofillChange["confidence"];
    reason: string;
    current?: EbosValidationResultInput;
    force?: boolean;
  }
) {
  if (!Number.isFinite(input.value) || input.value <= 0) return;

  const oldValue = input.current ? (input.current as Record<string, unknown>)[input.field] : undefined;
  const oldNumber = typeof oldValue === "number" && Number.isFinite(oldValue) ? oldValue : 0;
  const applied = Boolean(input.current) && (input.force === true || oldNumber <= input.value);
  changes.push({
    planId: input.planId,
    field: input.field,
    oldValue: oldValue ?? 0,
    newValue: input.value,
    source: input.source,
    confidence: input.confidence,
    reason: applied
      ? input.reason
      : `Skipped ${input.field}: existing value ${oldNumber} is higher than captured value ${input.value}.`,
    applied
  });
}

function labelForManualField(field: string) {
  const labels: Record<string, string> = {
    listingViews: "外部平台浏览量",
    messages: "外部平台咨询数",
    favorites: "外部平台收藏/想要数",
    manualOutreachCount: "手动触达数量",
    positiveReplies: "正向回复数量",
    userFeedback: "用户真实反馈",
    channelResults: "渠道结果明细"
  };
  return labels[field] ?? field;
}

function descriptionForManualField(field: string) {
  const descriptions: Record<string, string> = {
    listingViews: "闲鱼、淘宝、Whop、小红书或微信等外部渠道的真实浏览数。",
    messages: "外部渠道真实私信、评论咨询或购买前问题数量。",
    favorites: "外部平台真实收藏、想要或类似意向动作数量。",
    manualOutreachCount: "用户手动触达的人数或群数。",
    positiveReplies: "明确表达兴趣、想看目录、想确认价格或交付的真实回复数。",
    userFeedback: "真实用户原话摘要，不能由 Codex 编造。",
    channelResults: "每个外部渠道的链接、指标和备注。"
  };
  return descriptions[field] ?? "需要用户从真实外部渠道补充。";
}

function sourceHintForManualField(field: string) {
  const hints: Record<string, string> = {
    listingViews: "闲鱼/淘宝/Whop/小红书/微信后台或页面可见统计",
    messages: "平台私信、评论、微信群、微信私聊",
    favorites: "外部平台收藏/想要/点赞等公开或后台指标",
    manualOutreachCount: "用户手动记录",
    positiveReplies: "用户手动记录",
    userFeedback: "用户真实聊天或评论摘要",
    channelResults: "用户手动整理的渠道记录"
  };
  return hints[field] ?? "manual_input";
}

function exampleForManualField(field: string) {
  if (field === "userFeedback") return ["想先看目录再决定"];
  if (field === "channelResults") return [{ channel: "xiaohongshu", metricLabel: "messages", metricValue: 0, notes: "" }];
  return 0;
}

