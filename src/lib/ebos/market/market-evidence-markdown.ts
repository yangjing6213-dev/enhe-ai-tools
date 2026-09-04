import type { EbosMarketEvidence } from "./market-evidence-types";

export function renderMarketEvidenceMarkdown(evidence: EbosMarketEvidence) {
  return [
    "# ENHE Market Evidence Report",
    "",
    `目标日期：${evidence.targetDate}`,
    `周期：${evidence.periodStart} 至 ${evidence.periodEnd}`,
    `生成时间：${evidence.generatedAt}`,
    "",
    "## 1. 市场机会总体评分",
    `评分：${evidence.overallScore}`,
    `置信度：${evidence.confidence}`,
    "",
    "## 2. 市场信号来源",
    `信号总数：${evidence.signalSummary.totalSignals}`,
    `manual input：${evidence.signalSummary.manualSignals}`,
    `RSS：${evidence.signalSummary.rssSignals}`,
    "说明：manual input 为观察种子，不代表真实搜索量、销量或趋势数据。",
    "",
    "## 3. 热门主题与用户问题",
    "主题：",
    list(evidence.marketSummary.topTopics.map((item) => `${item.topic}: ${item.count}`)),
    "用户问题：",
    list(evidence.marketSummary.topUserProblems.map((item) => `${item.problem}: ${item.count}`)),
    "",
    "## 4. 产品机会评分",
    list(evidence.opportunityScores.map((item) => `${item.productDirection}: priority=${item.priorityScore}, action=${item.recommendedAction}`)),
    "",
    "## 5. 推荐产品方向",
    list(evidence.recommendedProductDirections.map((item) => `${item.productDirection}: ${item.description}`)),
    "",
    "## 6. 与 ENHE 当前产品的契合度",
    list(evidence.recommendedProductDirections.map((item) => `${item.productDirection}: enheFit=${item.enheFitScore}, formats=${item.suggestedProductFormats.join(", ")}`)),
    "",
    "## 7. 收益验证优先级",
    list(evidence.recommendedProductDirections.map((item) => `${item.productDirection}: ${item.recommendedAction}, ${item.suggestedPriceRange}`)),
    "",
    "## 8. 主要风险",
    list(evidence.risks),
    "",
    "## 9. 增长机会",
    list(evidence.opportunities),
    "",
    "## 10. Codex 市场行动任务",
    list(evidence.actionItems.map((item) => `[${item.priority}] ${item.title}: ${item.description}`)),
    "",
    "## 11. 数据源限制与后续接入",
    `configuredSources：${evidence.dataSourceSummary.configuredSources.join(", ") || "none"}`,
    `unavailableSources：${evidence.dataSourceSummary.unavailableSources.join(", ") || "none"}`,
    list(evidence.warnings.map((warning) => warning.message))
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
