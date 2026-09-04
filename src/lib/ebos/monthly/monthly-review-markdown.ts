import type {
  EbosMonthlyDecision,
  EbosMonthlyReview,
  EbosMonthlyStrategicFinding
} from "./monthly-review-types";

export function renderMonthlyReviewMarkdown(review: EbosMonthlyReview): string {
  return [
    "# ENHE Monthly Strategy Review",
    "",
    `周期：${review.periodStart} 至 ${review.periodEnd}`,
    `生成时间：${review.generatedAt}`,
    `Catalog：${review.evidenceCatalogPath}`,
    "",
    "## 1. 本月一句话结论",
    review.executiveSummary,
    "",
    "## 2. 本月经营评分",
    `- 总分：${formatScore(review.overallScore)}`,
    `- 置信度：${review.confidence}`,
    `- 样本说明：${review.evidenceUsed.length < 5 ? "样本不足，不能伪造收入、流量或订单结论。" : "样本数量满足基础月度复盘。"}`,
    "",
    "## 3. Evidence 使用情况",
    renderEvidence(review),
    "",
    "## 4. 本月主要进展",
    renderFindings(review.majorWins),
    "",
    "## 5. 本月主要风险",
    renderFindings(review.majorRisks),
    "",
    "## 6. 本月失败假设",
    renderFindings(review.failedAssumptions),
    "",
    "## 7. 增长机会",
    renderFindings(review.growthOpportunities),
    "",
    "## 8. Stop / Keep / Start",
    "### Stop",
    renderDecisions(review.stopDoing),
    "### Keep",
    renderDecisions(review.keepDoing),
    "### Start",
    renderDecisions(review.startDoing),
    "",
    "## 9. 下月 OKR",
    renderOkrs(review),
    "",
    "## 10. Codex 下月执行任务",
    renderDecisions(review.codexTasks),
    "",
    "## 11. 数据缺口",
    renderList(review.dataGaps),
    "",
    "## 12. 战略建议",
    renderList(review.strategicFindings.map((item) => item.recommendation))
  ].join("\n");
}

function renderEvidence(review: EbosMonthlyReview) {
  if (review.evidenceUsed.length === 0) return "- 暂无 evidence 被使用，样本不足。";
  return review.evidenceUsed
    .map((item) => `- ${item.evidenceKind} / ${item.targetDate} / ${formatScore(item.score ?? null)} / ${item.confidence}\n  - ${item.filePath}`)
    .join("\n");
}

function renderFindings(items: EbosMonthlyStrategicFinding[]) {
  if (!items.length) return "- 暂无明确结论，原因是 evidence 样本不足或对应 evidence 缺失。";
  return items
    .map((item) => `- [${item.severity}] ${item.title}\n  - ${item.description}\n  - 建议：${item.recommendation}`)
    .join("\n");
}

function renderDecisions(items: EbosMonthlyDecision[]) {
  if (!items.length) return "- 暂无。";
  return items
    .map((item) => `- [${item.priority}] ${item.title}\n  - 原因：${item.reason}\n  - Owner：${item.owner}`)
    .join("\n");
}

function renderOkrs(review: EbosMonthlyReview) {
  if (!review.nextMonthOKRs.length) return "- 暂无 OKR。";
  return review.nextMonthOKRs
    .map((okr, index) => {
      const keyResults = okr.keyResults.map((kr) => `  - KR：${kr.title}`).join("\n");
      return `${index + 1}. Objective：${okr.objective}\n${keyResults}`;
    })
    .join("\n");
}

function renderList(items: string[]) {
  if (!items.length) return "- 暂无。";
  return items.map((item) => `- ${item}`).join("\n");
}

function formatScore(score: number | null) {
  return score === null ? "unknown" : String(score);
}
