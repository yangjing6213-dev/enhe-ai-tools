import type {
  EbosSyntheticFailureAnalysis,
  EbosSyntheticOptimizationPlan
} from "./synthetic-scenario-types";

export function buildSyntheticOptimizationPlan(
  analysis: EbosSyntheticFailureAnalysis,
  options: {
    now?: string | Date;
  } = {}
): EbosSyntheticOptimizationPlan {
  return {
    planType: "synthetic_optimization_plan",
    targetDate: analysis.targetDate,
    generatedAt: toIso(options.now ?? new Date()),
    synthetic: true,
    priorityFixes: [
      "Priority 1: 修改验证页 Hero，把“AI Prompt Kit”改成更具体的结果导向标题：一套帮你快速生成产品文案、SEO 内容和 AI 工具方案的实用提示词模板包。",
      "Priority 2: 增加免费样例：免费领取 5 个高频 Prompt 模板。",
      "Priority 3: 增加交付物说明：100+ Prompt 模板、按场景分类、中英文双语、Notion / Markdown / PDF 格式、可直接复制使用。",
      "Priority 4: 增加价格测试：免费样例、19 元入门包、49 元完整包、99 元商业场景包。",
      "Priority 5: 重写私聊话术，从“帮我看看”改成“我做了一个可免费领取的小模板包，想送你试用一下”。",
      "Priority 6: 重写小红书标题，突出免费、可复制、省时间。",
      "Priority 7: 下一轮真实验证目标：100 访问、10 CTA 点击、5 私信咨询、1 付费意向、1 真实订单或预售意向。"
    ],
    copywritingChanges: [
      "把“验证页”文案改成用户能立刻理解的使用场景。",
      "把 CTA 从“查看页面”改成“免费领取 5 个模板”。",
      "把私聊话术改成给对方一个低负担试用理由。",
      "小红书标题优先强调“免费”“可复制”“省时间”。"
    ],
    landingPageChanges: [
      "Hero 展示结果导向标题和一条具体副标题。",
      "首屏加入 3 个 Prompt 模板示例截图或纯文本预览。",
      "加入“适合谁 / 不适合谁”。",
      "加入“购买后得到什么”。",
      "加入免费样例领取入口。"
    ],
    offerChanges: [
      "明确 100+ 模板数量。",
      "明确产品页、FAQ、SEO/GEO、上架、竞品分析、周复盘等场景分类。",
      "明确 Notion / Markdown / PDF 交付格式。",
      "准备免费样例、19 元入门包、49 元完整包、99 元商业场景包。"
    ],
    channelStrategyChanges: [
      "manual_outreach 继续小样本，但话术从求反馈改为送试用。",
      "wechat 加入个人故事和为什么做这个模板包。",
      "xiaohongshu 使用结果导向标题和模板预览封面。",
      "xianyu/taobao 等商品化渠道等交付和退款说明清晰后再测试。",
      "whop 仅在英文交付和授权账号环境准备好后测试。"
    ],
    nextSprintActions: [
      "更新验证页 Hero。",
      "添加 5 个免费模板样例。",
      "添加交付物和格式说明。",
      "准备 19/49/99 价格层级文案。",
      "重写并发送 10 人私聊话术。",
      "重写并发布 1 篇小红书笔记。",
      "24 小时后只把真实数据填入 external-publish-result-input.json。"
    ],
    successCriteria: [
      "100 个真实页面访问。",
      "10 次真实 CTA 点击。",
      "5 个真实私信咨询。",
      "1 个真实付费意向。",
      "1 个真实订单或预售意向。",
      "hasRealSignals=true 来自真实数据，而不是 synthetic scenario。",
      "canBackfill=true 且 blockers=0 后才允许真实 apply。"
    ],
    warnings: [
      "This is a synthetic optimization plan.",
      "Do not backfill as real data.",
      "Do not use for revenue evidence.",
      "Do not claim real market validation."
    ]
  };
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

