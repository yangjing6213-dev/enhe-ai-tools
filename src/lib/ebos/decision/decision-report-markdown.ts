import type { EbosDecisionReport, EbosValidationPlan } from "./decision-types";

export function renderDecisionReportMarkdown(report: EbosDecisionReport) {
  const humanTasks = report.validationPlans.flatMap((plan) => plan.humanTasks);

  return [
    "# ENHE Cross-Evidence Decision Report",
    "",
    `目标日期：${report.targetDate}`,
    `周期：${report.periodStart} 至 ${report.periodEnd}`,
    `生成时间：${report.generatedAt}`,
    `整体置信度：${report.overallConfidence}`,
    "",
    "## 1. 本周一句话决策",
    report.strategicSummary,
    "",
    "## 2. 使用的 Evidence",
    list(report.evidenceUsed.map((item) => `${item.evidenceKind}: ${item.filePath}, score=${item.score ?? "unknown"}, confidence=${item.confidence}`)),
    "",
    "## 3. 优先验证产品方向",
    list(report.priorityProductDirections.slice(0, 5).map((item) => `${item.name}: score=${item.totalPriorityScore}, recommendation=${item.recommendation}, reason=${item.reason}`)),
    "",
    "## 4. 优先验证现有产品",
    list(report.priorityExistingProducts.slice(0, 5).map((item) => `${item.productName}: score=${item.totalPriorityScore}, recommendation=${item.recommendation}, reason=${item.reason}`)),
    "",
    "## 5. 推荐验证计划",
    list(report.validationPlans.map(renderPlanLine)),
    "",
    "## 6. 本周只做什么",
    list(report.doNext.map((item) => `${item.title}: ${item.reason}`)),
    "",
    "## 7. 本周不要做什么",
    list(report.stopDoing.map((item) => `${item.title}: ${item.reason}`)),
    "",
    "## 8. Codex 执行任务",
    list(report.codexTasks.map((item) => `[${item.priority}] ${item.title}: ${item.description}`)),
    "",
    "## 9. 人工执行任务",
    list(humanTasks),
    "",
    "## 10. 风险与限制",
    list([
      ...report.risks,
      "本报告不代表流量、销量或收入；所有建议都必须通过下周验证计划确认。"
    ]),
    "",
    "## 11. 下一步数据缺口",
    list(report.dataGaps.length ? report.dataGaps : ["暂无关键 evidence kind 缺口；继续提高数据置信度。"])
  ].join("\n");
}

function renderPlanLine(plan: EbosValidationPlan) {
  return `${plan.title}: method=${plan.validationMethod}, metric=${plan.successMetric}, threshold=${plan.minimumSuccessThreshold}`;
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
