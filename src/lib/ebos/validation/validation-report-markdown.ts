import type { EbosValidationAnalysis, EbosValidationResultReport } from "./validation-types";

export function renderValidationResultReportMarkdown(report: EbosValidationResultReport) {
  return [
    "# ENHE Validation Result Report",
    "",
    `目标日期：${report.targetDate}`,
    `生成时间：${report.generatedAt}`,
    `Tracker：${report.trackerPath}`,
    `Input：${report.inputPath ?? "尚未提供"}`,
    "",
    "## 1. 验证结果总览",
    report.summary || "尚未开始或尚未记录结果。",
    `Overall validation score: ${report.overallValidationScore}`,
    renderCaptureSummary(report),
    renderExternalIntakeSummary(report),
    "",
    "## 2. 本轮验证计划",
    list(report.analyses.map((analysis) => `${analysis.title}: ${analysis.targetProduct ?? analysis.targetDirection}`)),
    "",
    "## 3. 结果填写情况",
    list(report.analyses.map(renderInputStatus)),
    "",
    "## 4. 单项验证分析",
    list(report.analyses.map(renderAnalysisLine)),
    "",
    "## 5. 应该继续的方向",
    list(report.continueDirections),
    "",
    "## 6. 应该调整的方向",
    list(report.adjustDirections),
    "",
    "## 7. 应该停止的方向",
    list(report.stopDirections),
    "",
    "## 8. 可以放大的方向",
    list(report.scaleDirections),
    "",
    "## 9. Codex 下一步任务",
    list(report.codexTasks),
    "",
    "## 10. 人工下一步任务",
    list(report.humanTasks),
    "",
    "## 11. 风险与数据不足",
    list([
      ...report.warnings,
      "Data quality reminders:",
      ...report.analyses.flatMap(renderDataQualityReminders),
      "Next-run recording suggestions:",
      ...report.analyses.flatMap(renderNextRunRecordingSuggestions),
      ...(report.analyses.some((analysis) => analysis.successStatus === "not_started")
        ? ["尚未开始或尚未记录结果，不能据此判断需求失败。"]
        : []),
      ...(report.captureSummary && report.captureSummary.manualSlotsCount > 0
        ? ["外部渠道数据仍需补充，不能由 Codex 代填。"]
        : []),
      ...(report.externalIntakeSummary
        ? [report.externalIntakeSummary.summary]
        : [])
    ])
  ].join("\n");
}

function renderCaptureSummary(report: EbosValidationResultReport) {
  if (!report.captureSummary) return "Capture summary: no validation capture report found.";
  return [
    `Capture report：${report.captureReportPath ?? "unknown"}`,
    `Capture summary: analyticsAvailable=${report.captureSummary.analyticsAvailable}, eventsDetected=${report.captureSummary.eventsDetected}, ctaClicksDetected=${report.captureSummary.ctaClicksDetected}, ordersAvailable=${report.captureSummary.ordersAvailable}, paidOrders=${report.captureSummary.paidOrders}, revenue=${report.captureSummary.revenue}, refundCount=${report.captureSummary.refundCount}, manualSlots=${report.captureSummary.manualSlotsCount}.`
  ].join("\n");
}

function renderExternalIntakeSummary(report: EbosValidationResultReport) {
  const summary = report.externalIntakeSummary;
  if (!summary) return "External intake: no external intake template or import report found.";
  return [
    `External intake: status=${summary.status}, importedChannels=${summary.importedChannelsCount}, importedPlans=${summary.importedPlansCount}, appliedChanges=${summary.appliedChangesCount}, skippedChanges=${summary.skippedChangesCount}.`,
    summary.inputPath ? `External intake input: ${summary.inputPath}` : "",
    summary.importReportPath ? `External intake import report: ${summary.importReportPath}` : "",
    `External intake summary: ${summary.summary}`
  ].filter(Boolean).join("\n");
}

function renderInputStatus(analysis: EbosValidationAnalysis) {
  const completeness = analysis.inputCompleteness;
  return [
    `${analysis.title}: status=${analysis.status}, success=${analysis.successStatus}, recommendation=${analysis.decisionRecommendation}`,
    completeness ? `Input completeness: ${completeness.completenessPercent}% (${completeness.level})` : ""
  ].filter(Boolean).join("; ");
}

function renderAnalysisLine(analysis: EbosValidationAnalysis) {
  return [
    `${analysis.title}: score=${analysis.score}, recommendation=${analysis.decisionRecommendation}.`,
    `Reason: ${analysis.reason}`,
    renderChannelAttribution(analysis),
    analysis.dataQualityWarnings?.length ? `Data quality reminders: ${analysis.dataQualityWarnings.join("; ")}` : "",
    `Evidence: ${analysis.evidenceSummary.length ? analysis.evidenceSummary.join("; ") : "尚未开始或尚未记录结果"}`,
    analysis.nextActions.length ? `Next: ${analysis.nextActions.join("; ")}` : ""
  ].filter(Boolean).join(" ");
}

function renderChannelAttribution(analysis: EbosValidationAnalysis) {
  const attribution = analysis.channelAttributionSummary;
  if (!attribution) return "";
  const summary = attribution.summary.length
    ? attribution.summary.join("; ")
    : "No channel data recorded.";
  return `Channel attribution: ${summary}`;
}

function renderDataQualityReminders(analysis: EbosValidationAnalysis) {
  return analysis.dataQualityWarnings?.length
    ? analysis.dataQualityWarnings.map((warning) => `${analysis.title}: ${warning}`)
    : [`${analysis.title}: no data quality warnings.`];
}

function renderNextRunRecordingSuggestions(analysis: EbosValidationAnalysis) {
  const suggestions = analysis.inputCompleteness?.suggestedFieldsToFill?.[analysis.planId] ?? [];
  return suggestions.length
    ? [`${analysis.title}: fill ${suggestions.join(", ")}.`]
    : [`${analysis.title}: keep recording observed channel metrics and notes.`];
}

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- none";
}
