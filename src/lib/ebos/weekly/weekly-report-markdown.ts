import type { EbosActionItem, EbosReport, EbosReportSection } from "../types";
import { formatLocalDate, formatLocalDateTime } from "./date-format";
import type { EbosWeeklyPlan } from "./weekly-report-types";

const sectionMap: Array<[string, string]> = [
  ["revenue", "## 3. 收入分析"],
  ["traffic", "## 4. 流量分析"],
  ["seo", "## 5. SEO 分析"],
  ["geo", "## 6. GEO 分析"],
  ["product", "## 7. 产品分析"],
  ["content", "## 8. 内容分析"],
  ["market", "## 9. 市场机会"],
  ["competitor", "## 10. 竞争对手"],
  ["website_health", "## 11. 网站健康"]
];

export function renderWeeklyReportMarkdown(report: EbosReport, plan: EbosWeeklyPlan): string {
  const lines: string[] = [
    "# ENHE Weekly Business Review",
    "",
    `周期：${formatLocalDate(report.period.start)} 至 ${formatLocalDate(report.period.end)}`,
    `生成时间：${formatLocalDateTime(report.generatedAt)}`,
    "",
    "## 1. 本周一句话结论",
    buildOneLineConclusion(report),
    "",
    "## 2. 本周经营评分",
    `- 总分：${formatScore(report.overallScore)}`,
    `- 置信度：${report.confidence}`,
    `- 数据源状态：${reportWarningsSummary(report)}`,
    ""
  ];

  for (const [key, heading] of sectionMap) {
    const section = report.sections.find((item) => item.key === key);
    lines.push(heading, renderSection(section), "");
  }

  lines.push("## 12. 下周 OKR", renderOkrs(plan), "");
  lines.push("## 13. Codex 下周执行任务", renderActions(plan.actionItems), "");
  lines.push("## 14. 数据缺口与后续接入建议", renderDataGaps(report), "");

  return lines.join("\n");
}

function renderSection(section?: EbosReportSection) {
  if (!section) return "- 当前 section 缺失，需要修复 EBOS report schema。";
  return [
    `- 评分：${formatScore(section.score)} / ${section.grade}`,
    `- 置信度：${section.confidence}`,
    renderList("关键发现", section.findings),
    renderList("风险", section.risks),
    renderList("机会", section.opportunities),
    renderList("行动项", section.actionItems.map((item) => `${item.title}：${item.verification}`)),
    renderList("数据提醒", section.warnings.map((warning) => warning.message))
  ].join("\n");
}

function renderOkrs(plan: EbosWeeklyPlan) {
  return plan.okrs
    .map((okr, index) => {
      const keyResults = okr.keyResults.map((kr) => `  - KR：${kr.title}`).join("\n");
      return `${index + 1}. Objective：${okr.objective}\n${keyResults}`;
    })
    .join("\n");
}

function renderActions(items: EbosActionItem[]) {
  return items
    .map((item, index) => `${index + 1}. [${item.priority}] ${item.title}\n   - 验收：${item.verification}`)
    .join("\n");
}

function renderDataGaps(report: EbosReport) {
  const warnings = report.warnings.map((warning) => `- ${warning.message}`);
  const productUrlSourceRecommendations = [
    "- Configure EBOS_SITE_URL to the exact site being inspected.",
    "- Configure DATABASE_URL to match the environment currently being inspected.",
    "- Prefer sitemap.xml as the online URL evidence source for key product page checks."
  ];

  return [
    ...(warnings.length ? warnings : ["- 当前周报没有发现全局数据缺口。"]),
    ...productUrlSourceRecommendations
  ].join("\n");
}

function renderList(label: string, items: string[]) {
  if (!items.length) return `- ${label}：暂无明确数据，需继续接入。`;
  return [`- ${label}：`, ...items.map((item) => `  - ${item}`)].join("\n");
}

function buildOneLineConclusion(report: EbosReport) {
  const revenue = report.sections.find((section) => section.key === "revenue");
  if (!revenue || revenue.score === null || revenue.score < 50) {
    return "本周 EBOS 判断：当前最重要任务是验证真实收入路径，同时补齐 SEO/GEO 和市场数据源。";
  }
  return "本周 EBOS 判断：已有经营信号可用，下一步应扩大收入路径并补齐外部增长数据。";
}

function reportWarningsSummary(report: EbosReport) {
  if (!report.warnings.length) return "主要数据源可用";
  return `${report.warnings.length} 条数据缺口 warning`;
}

function formatScore(score: number | null) {
  return score === null ? "unknown" : String(score);
}
