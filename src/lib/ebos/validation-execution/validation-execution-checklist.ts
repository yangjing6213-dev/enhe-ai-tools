import type {
  EbosValidationExecutionChecklist,
  EbosValidationExecutionChecklistItem,
  EbosValidationExecutionPlan
} from "./validation-execution-types";

export function buildExecutionChecklist(plan: EbosValidationExecutionPlan): EbosValidationExecutionChecklist {
  return {
    codex: buildCodexExecutionChecklist(plan),
    human: buildHumanExecutionChecklist(plan)
  };
}

export function buildCodexExecutionChecklist(plan: EbosValidationExecutionPlan): EbosValidationExecutionChecklistItem[] {
  return [
    item("codex", "optimize-title", "创建/优化产品页标题", [`${plan.title} has a clear validation-focused title.`]),
    item("codex", "add-summary", "增加 Summary", ["Summary explains the offer, target user, and expected outcome."]),
    item("codex", "add-faq", "增加 FAQ", ["FAQ covers price, delivery, support, privacy, and refund expectations."]),
    item("codex", "add-cta", "增加 CTA", ["CTA text is visible and maps to the fields in the validation input."]),
    item("codex", "add-purchase-entry", "增加购买/咨询入口", ["Purchase or consultation entry is visible and testable."]),
    item("codex", "marketplace-copy", "生成 Whop/淘宝/闲鱼文案", ["Marketplace copy has title, value proposition, price placeholder, FAQ, and CTA."]),
    item("codex", "seo-geo-tags", "生成 SEO/GEO 标签", ["SEO/GEO title, description, and answer-friendly summary are drafted."]),
    item("codex", "tracking-note", "增加 tracking note 占位", ["Tracking note lists metrics to be filled manually; no result values are fabricated."])
  ];
}

export function buildHumanExecutionChecklist(plan: EbosValidationExecutionPlan): EbosValidationExecutionChecklistItem[] {
  return [
    item("human", "publish-page-or-listing", "发布页面或商品", [`${plan.title} is published or explicitly skipped with a reason.`]),
    item("human", "share-target-channels", "分享到目标渠道", ["At least one planned channel has a posted link or a skipped reason."]),
    item("human", "record-clicks-leads-orders", "记录点击/咨询/订单", ["CTA clicks, leads, orders, and revenue are recorded as observed values only."]),
    item("human", "record-user-feedback", "记录用户反馈", ["User feedback is copied or summarized without inventing buyer intent."]),
    item("human", "record-refund-reasons", "记录退款原因", ["Refund count and refund reasons are recorded when refunds exist."])
  ];
}

function item(
  owner: "codex" | "human",
  id: string,
  title: string,
  acceptanceCriteria: string[]
): EbosValidationExecutionChecklistItem {
  return {
    id,
    title,
    owner,
    acceptanceCriteria
  };
}
