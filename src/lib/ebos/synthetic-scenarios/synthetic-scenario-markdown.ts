import type {
  EbosSyntheticChannelResult,
  EbosSyntheticFailureAnalysis,
  EbosSyntheticFailureScenario,
  EbosSyntheticOptimizationImplementation,
  EbosSyntheticOptimizationPlan
} from "./synthetic-scenario-types";

export function renderSyntheticFailureScenarioMarkdown(
  scenario: EbosSyntheticFailureScenario,
  analysis?: EbosSyntheticFailureAnalysis,
  optimizationPlan?: EbosSyntheticOptimizationPlan
) {
  return [
    "# EBOS Synthetic Failure Scenario Report",
    "",
    "## 1. 模拟目的",
    scenario.simulationPurpose,
    "",
    "## 2. 重要声明：这是模拟数据",
    "- synthetic: true",
    "- simulated: true",
    "- 这不是外部平台真实数据。",
    "- 不能作为真实数据回填。",
    "- 不能作为收入证据。",
    "- 不能声称真实发布已经发生。",
    "",
    "## 3. 最坏情况假设",
    list(scenario.failureAssumptions),
    "",
    "## 4. 模拟渠道数据",
    renderChannelTable(scenario.simulatedChannelResults),
    "",
    "## 5. 漏斗诊断",
    list(analysis?.funnelDiagnosis ?? [
      `simulatedViews=${scenario.simulatedFunnelSummary.simulatedViews}`,
      `simulatedClicks=${scenario.simulatedFunnelSummary.simulatedClicks}`,
      `simulatedLeads=${scenario.simulatedFunnelSummary.simulatedLeads}`,
      `simulatedPaidOrders=${scenario.simulatedFunnelSummary.simulatedPaidOrders}`,
      `simulatedRevenue=${scenario.simulatedFunnelSummary.simulatedRevenue}`
    ]),
    "",
    "## 6. 可能失败原因",
    list(analysis?.likelyFailureReasons ?? ["Analysis not generated yet. Run analyze-ebos-synthetic-failure-scenario."]),
    "",
    "## 7. 页面问题",
    list(analysis?.pageIssues ?? ["Analysis not generated yet."]),
    "",
    "## 8. 产品/报价问题",
    list([
      ...(analysis?.offerIssues ?? []),
      ...(analysis?.pricingIssues ?? [])
    ]),
    "",
    "## 9. 渠道问题",
    list(analysis?.channelIssues ?? ["Analysis not generated yet."]),
    "",
    "## 10. 优先优化建议",
    list(optimizationPlan?.priorityFixes ?? analysis?.recommendedFixes ?? ["Optimization plan not generated yet."]),
    "",
    "## 11. 下一轮真实验证计划",
    list(optimizationPlan?.nextSprintActions ?? analysis?.nextExperimentPlan ?? [
      "Run analysis first, then execute only real external publishing and real data collection."
    ]),
    "",
    "## Safety Warnings",
    list(scenario.warnings)
  ].join("\n");
}

export function renderSyntheticFailureAnalysisMarkdown(analysis: EbosSyntheticFailureAnalysis) {
  return [
    "# EBOS Synthetic Failure Analysis",
    "",
    `- targetDate: ${analysis.targetDate}`,
    `- generatedAt: ${analysis.generatedAt}`,
    `- synthetic: ${String(analysis.synthetic)}`,
    analysis.simulatedScenarioPath ? `- simulatedScenarioPath: ${analysis.simulatedScenarioPath}` : "- simulatedScenarioPath: none",
    "",
    "## Funnel Diagnosis",
    list(analysis.funnelDiagnosis),
    "",
    "## Likely Failure Reasons",
    list(analysis.likelyFailureReasons),
    "",
    "## Page Issues",
    list(analysis.pageIssues),
    "",
    "## Offer Issues",
    list(analysis.offerIssues),
    "",
    "## Channel Issues",
    list(analysis.channelIssues),
    "",
    "## Pricing Issues",
    list(analysis.pricingIssues),
    "",
    "## Trust Issues",
    list(analysis.trustIssues),
    "",
    "## Recommended Fixes",
    list(analysis.recommendedFixes),
    "",
    "## Next Experiment Plan",
    list(analysis.nextExperimentPlan),
    "",
    "## Safety Warnings",
    list(analysis.warnings)
  ].join("\n");
}

export function renderSyntheticOptimizationPlanMarkdown(plan: EbosSyntheticOptimizationPlan) {
  return [
    "# EBOS Synthetic Optimization Plan",
    "",
    `- targetDate: ${plan.targetDate}`,
    `- generatedAt: ${plan.generatedAt}`,
    `- synthetic: ${String(plan.synthetic)}`,
    "",
    "## Priority Fixes",
    list(plan.priorityFixes),
    "",
    "## Copywriting Changes",
    list(plan.copywritingChanges),
    "",
    "## Landing Page Changes",
    list(plan.landingPageChanges),
    "",
    "## Offer Changes",
    list(plan.offerChanges),
    "",
    "## Channel Strategy Changes",
    list(plan.channelStrategyChanges),
    "",
    "## Next Sprint Actions",
    list(plan.nextSprintActions),
    "",
    "## Success Criteria",
    list(plan.successCriteria),
    "",
    "## Safety Warnings",
    list(plan.warnings)
  ].join("\n");
}

export function renderSyntheticOptimizationImplementationMarkdown(report: EbosSyntheticOptimizationImplementation) {
  return [
    "# EBOS Synthetic Optimization Implementation",
    "",
    `- targetDate: ${report.targetDate}`,
    `- generatedAt: ${report.generatedAt}`,
    `- synthetic: ${String(report.synthetic)}`,
    report.sourceOptimizationPlanPath ? `- sourceOptimizationPlanPath: ${report.sourceOptimizationPlanPath}` : "- sourceOptimizationPlanPath: none",
    "",
    "## Implemented Fixes",
    list(report.implementedFixes),
    "",
    "## Files Changed",
    list(report.filesChanged),
    "",
    "## CTA Changes",
    list(report.ctaChanges),
    "",
    "## Offer Changes",
    list(report.offerChanges),
    "",
    "## Pricing Test Changes",
    list(report.pricingTestChanges),
    "",
    "## Copywriting Changes",
    list(report.copywritingChanges),
    "",
    "## Remaining Risks",
    list(report.remainingRisks),
    "",
    "## Next Real Validation Plan",
    list(report.nextRealValidationPlan),
    "",
    "## Safety Warnings",
    list(report.warnings)
  ].join("\n");
}

function renderChannelTable(results: EbosSyntheticChannelResult[]) {
  return [
    "| channel | simulatedPublished | simulatedViews | simulatedClicks | simulatedMessages | simulatedLeads | simulatedPaidOrders | simulatedRevenue | failureNotes |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...results.map((item) => [
      item.channel,
      String(item.simulatedPublished),
      String(item.simulatedViews),
      String(item.simulatedClicks),
      String(item.simulatedMessages),
      String(item.simulatedLeads),
      String(item.simulatedPaidOrders),
      String(item.simulatedRevenue),
      item.failureNotes
    ].join(" | ")).map((line) => `| ${line} |`)
  ].join("\n");
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
