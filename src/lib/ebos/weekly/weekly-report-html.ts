import type { EbosReport, EbosReportSection } from "../types";
import { formatLocalDate } from "./date-format";
import type { EbosWeeklyPlan } from "./weekly-report-types";

export function renderWeeklyReportHtml(report: EbosReport, plan: EbosWeeklyPlan): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ENHE Weekly Business Review</title>
  <style>
    :root { color-scheme: dark; --bg: #08111f; --panel: #101b2d; --line: rgba(255,255,255,.12); --text: #eef4ff; --muted: #97a6bd; --accent: #5eead4; --warn: #fbbf24; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, "Microsoft YaHei", system-ui, sans-serif; line-height: 1.6; }
    main { max-width: 1120px; margin: 0 auto; padding: 40px 20px 56px; }
    h1 { margin: 0; font-size: 34px; letter-spacing: 0; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    .muted { color: var(--muted); }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 24px 0; }
    .score-card, .section-card, .next-week-plan { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 18px; }
    .score { font-size: 40px; font-weight: 800; color: var(--accent); }
    .section-card { margin-top: 16px; }
    ul, ol { padding-left: 20px; }
    li { margin: 6px 0; }
    .warning { color: var(--warn); }
    .tag { display: inline-block; margin-left: 8px; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>ENHE Weekly Business Review</h1>
    <p class="muted">${escapeHtml(formatLocalDate(report.period.start))} 至 ${escapeHtml(formatLocalDate(report.period.end))}</p>
    <section class="grid">
      <div class="score-card">
        <div class="muted">经营总分</div>
        <div class="score">${escapeHtml(formatScore(report.overallScore))}</div>
        <div class="muted">Confidence: ${escapeHtml(report.confidence)}</div>
      </div>
      <div class="score-card">
        <div class="muted">数据缺口</div>
        <div class="score">${report.warnings.length}</div>
        <div class="muted">所有缺失数据均以 warning 标注，不生成假数据。</div>
      </div>
    </section>
    ${report.sections.map(renderSection).join("\n")}
    <section class="next-week-plan">
      <h2>下周计划</h2>
      <ol>${plan.actionItems.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><br><span class="muted">${escapeHtml(item.verification)}</span></li>`).join("")}</ol>
    </section>
  </main>
</body>
</html>`;
}

function renderSection(section: EbosReportSection) {
  return `<section class="section-card">
  <h2>${escapeHtml(section.title)} <span class="tag">${escapeHtml(formatScore(section.score))} / ${escapeHtml(section.grade)} / ${escapeHtml(section.confidence)}</span></h2>
  ${renderList("关键发现", section.findings)}
  ${renderList("风险", section.risks)}
  ${renderList("机会", section.opportunities)}
  ${section.warnings.length ? `<p class="warning">${escapeHtml(section.warnings[0].message)}</p>` : ""}
</section>`;
}

function renderList(label: string, items: string[]) {
  const rows = items.length ? items : ["暂无明确数据，需继续接入。"];
  return `<div><strong>${escapeHtml(label)}</strong><ul>${rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`;
}

function formatScore(score: number | null) {
  return score === null ? "unknown" : String(score);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
