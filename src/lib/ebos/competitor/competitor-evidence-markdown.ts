import type { EbosCompetitorEvidence } from "./competitor-evidence-types";

export function renderCompetitorEvidenceMarkdown(evidence: EbosCompetitorEvidence) {
  return [
    "# ENHE Competitor Evidence Report",
    "",
    `目标日期：${evidence.targetDate}`,
    `周期：${evidence.periodStart} 至 ${evidence.periodEnd}`,
    `生成时间：${evidence.generatedAt}`,
    "",
    "## 1. 竞品分析总体评分",
    `评分：${evidence.overallScore}`,
    `置信度：${evidence.confidence}`,
    "",
    "## 2. 竞品种子与数据来源",
    `competitors：${evidence.competitorSummary.competitorsCount}`,
    `audited：${evidence.competitorSummary.competitorsAuditedCount}`,
    `manual seed：${evidence.dataSourceSummary.manualSeedsCount}`,
    "说明：manual seed 是观察对象，不代表完整竞品名单；本报告不伪造竞品销量、流量或收入。",
    "",
    "## 3. 竞品分类洞察",
    list(evidence.categoryInsights),
    "",
    "## 4. 产品方向对比",
    list(evidence.competitorAudits.map((audit) => `${audit.name}: ${audit.productTypes.join(", ") || audit.positioningSummary}`)),
    "",
    "## 5. 价格与变现入口洞察",
    list(evidence.pricingInsights),
    "",
    "## 6. SEO/GEO 页面结构洞察",
    list([...evidence.seoInsights, ...evidence.geoInsights]),
    "",
    "## 7. ENHE 差异化机会",
    list(evidence.differentiationOpportunities.map((item) => `${item.title}: priority=${item.priorityScore}, action=${item.recommendedAction}`)),
    "",
    "## 8. 产品缺口与内容缺口",
    list(evidence.productGapInsights),
    "",
    "## 9. 推荐行动优先级",
    list(evidence.differentiationOpportunities.map((item) => `[${item.recommendedAction}] ${item.title}: ${item.suggestedCodexTasks[0] ?? item.description}`)),
    "",
    "## 10. 主要风险",
    list(evidence.risks),
    "",
    "## 11. Codex 竞品行动任务",
    list(evidence.actionItems.map((item) => `[${item.priority}] ${item.title}: ${item.description}`)),
    "",
    "## 12. 数据源限制与后续接入",
    `networkSourcesEnabled：${String(evidence.dataSourceSummary.networkSourcesEnabled)}`,
    `pagesAttempted：${evidence.dataSourceSummary.pagesAttempted}`,
    `pagesSucceeded：${evidence.dataSourceSummary.pagesSucceeded}`,
    `pagesFailed：${evidence.dataSourceSummary.pagesFailed}`,
    renderPublicAuditDetails(evidence),
    list(evidence.warnings.map((warning) => warning.message))
  ].join("\n");
}

function renderPublicAuditDetails(evidence: EbosCompetitorEvidence) {
  const audited = evidence.competitorAudits.filter((audit) => audit.pagesAudited > 0);
  const details = audited.length
    ? audited.map((audit) => [
        `- ${audit.name}: pagesAudited=${audit.pagesAudited}`,
        `pricing=${audit.pricingSignals.length ? "Pricing" : "none"}`,
        `funnel=${audit.funnelSignals.length ? audit.funnelSignals.join("/") : "none"}`,
        `seo=${audit.seoStrengths.length ? audit.seoStrengths.join("/") : "none"}`,
        `geo=${audit.geoStrengths.length ? audit.geoStrengths.join("/") : "none"}`
      ].join(", "))
    : ["- no audited competitor public pages"];

  return [
    "",
    "Public URL audit details:",
    `- includeNetworkSources=${String(evidence.dataSourceSummary.networkSourcesEnabled)}`,
    ...details,
    "- Only public page structure was observed; this does not represent traffic, sales, or revenue."
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
