import type {
  EbosSyntheticFailureAnalysis,
  EbosSyntheticFailureScenario
} from "./synthetic-scenario-types";

export function analyzeSyntheticFailureScenario(
  scenario: EbosSyntheticFailureScenario,
  options: {
    simulatedScenarioPath?: string;
    now?: string | Date;
  } = {}
): EbosSyntheticFailureAnalysis {
  return {
    analysisType: "synthetic_failure_analysis",
    targetDate: scenario.targetDate,
    generatedAt: toIso(options.now ?? new Date()),
    synthetic: true,
    ...(options.simulatedScenarioPath ? { simulatedScenarioPath: options.simulatedScenarioPath } : {}),
    funnelDiagnosis: buildFunnelDiagnosis(scenario),
    likelyFailureReasons: [
      "用户不知道 Prompt Kit 具体能解决什么痛点。",
      "页面表达偏概念，缺少具体交付物截图。",
      "缺少价格锚点。",
      "缺少立即可获得的免费样例。",
      "CTA 不够具体。",
      "信任证明不足。",
      "渠道人群与产品不匹配。",
      "小红书标题不够结果导向。",
      "私聊话术没有给对方足够明确的帮助理由。"
    ],
    pageIssues: [
      "Hero 需要更具体。",
      "需要展示 3 个真实 Prompt 模板示例。",
      "需要增加“适合谁 / 不适合谁”。",
      "需要增加“购买后得到什么”。",
      "需要增加“免费领取 5 个模板”的入口。"
    ],
    offerIssues: [
      "产品边界不清。",
      "没有明确模板数量。",
      "没有明确使用场景。",
      "没有明确交付格式。",
      "缺少入门低价包。"
    ],
    channelIssues: [
      "manual outreach 样本太小。",
      "微信私域需要更强个人故事。",
      "小红书需要标题和封面更强。",
      "闲鱼/淘宝可能更适合商品化验证。"
    ],
    pricingIssues: [
      "缺少免费样例作为零风险入口。",
      "缺少 19 元入门包作为低摩擦付费测试。",
      "缺少 49 元完整包和 99 元商业场景包的价格阶梯。"
    ],
    trustIssues: [
      "缺少模板预览截图。",
      "缺少真实使用前后的对比。",
      "缺少退款、交付和使用边界说明。",
      "缺少作者为什么能解决这个问题的可信叙述。"
    ],
    recommendedFixes: [
      "将 Hero 改成结果导向标题。",
      "增加免费领取 5 个高频 Prompt 模板入口。",
      "增加 100+ 模板、场景分类、双语、Notion/Markdown/PDF 格式说明。",
      "增加价格阶梯测试。",
      "重写私聊话术，从“帮我看看”改为“免费送你一个小模板包试用”。",
      "重写小红书标题，突出免费、可复制、省时间。",
      "下一轮验证只使用真实渠道数据，不把本模拟结果写入 EBOS 回填链路。"
    ],
    nextExperimentPlan: [
      "更新验证页 Hero 和交付物说明。",
      "上线免费 5 个模板领取入口。",
      "准备 19/49/99 三档价格测试文案。",
      "用新私聊话术触达 10 个真实潜在用户。",
      "用新标题发布 1 篇小红书笔记。",
      "24 小时后只记录真实曝光、点击、私信、线索、付费意向、订单和反馈。",
      "只有 hasRealSignals=true 且 canBackfill=true 时才进入真实 backfill apply。"
    ],
    warnings: [
      "This is synthetic analysis.",
      "Do not backfill as real data.",
      "Do not use for revenue evidence.",
      "Do not claim real market validation."
    ]
  };
}

function buildFunnelDiagnosis(scenario: EbosSyntheticFailureScenario) {
  const summary = scenario.simulatedFunnelSummary;
  return [
    `exposure low: simulatedViews=${summary.simulatedViews}.`,
    `click low: simulatedClicks=${summary.simulatedClicks}; simulatedClickRate=${summary.simulatedClickRate}.`,
    `message low: simulatedMessages=${summary.simulatedMessages}; most messages are simulated outreach sends, not real replies.`,
    `lead zero: simulatedLeads=${summary.simulatedLeads}.`,
    `paid conversion zero: simulatedPaidOrders=${summary.simulatedPaidOrders}; simulatedRevenue=${summary.simulatedRevenue}.`
  ];
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

