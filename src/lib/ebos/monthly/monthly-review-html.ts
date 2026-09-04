import type { EbosMonthlyReview } from "./monthly-review-types";

export function renderMonthlyReviewHtml(review: EbosMonthlyReview): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ENHE Monthly Strategy Review</title>
  <style>
    :root { color-scheme: dark; --bg: #07111d; --panel: #0f1c2d; --line: rgba(255,255,255,.14); --text: #f3f7ff; --muted: #9fb0c7; --accent: #13c4e2; --warn: #f59e0b; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, "Microsoft YaHei", system-ui, sans-serif; line-height: 1.65; }
    main { max-width: 1120px; margin: 0 auto; padding: 40px 20px 56px; }
    h1 { margin: 0; font-size: 34px; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    .muted { color: var(--muted); }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 24px 0; }
    .score-card, .panel { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 18px; }
    .score { font-size: 42px; font-weight: 800; color: var(--accent); }
    .panel { margin-top: 16px; }
    ul, ol { padding-left: 20px; }
    li { margin: 6px 0; }
    .warning { color: var(--warn); }
  </style>
</head>
<body>
  <main>
    <h1>ENHE Monthly Strategy Review</h1>
    <p class="muted">${escapeHtml(review.periodStart)} 至 ${escapeHtml(review.periodEnd)}</p>
    <section class="grid">
      <div class="score-card">
        <div class="muted">本月经营评分</div>
        <div class="score">${escapeHtml(formatScore(review.overallScore))}</div>
        <div class="muted">Confidence: ${escapeHtml(review.confidence)}</div>
      </div>
      <div class="score-card">
        <div class="muted">Evidence Used</div>
        <div class="score">${review.evidenceUsed.length}</div>
        <div class="muted">${review.evidenceUsed.length < 5 ? "样本不足" : "样本满足基础复盘"}</div>
      </div>
    </section>
    <section class="panel">
      <h2>Evidence 使用情况</h2>
      <ul>${review.evidenceUsed.map((item) => `<li>${escapeHtml(item.evidenceKind)} / ${escapeHtml(item.targetDate)} / ${escapeHtml(item.filePath)}</li>`).join("") || "<li>暂无 evidence。</li>"}</ul>
    </section>
    <section class="panel">
      <h2>Stop / Keep / Start</h2>
      <h3>Stop</h3>${renderDecisionList(review.stopDoing)}
      <h3>Keep</h3>${renderDecisionList(review.keepDoing)}
      <h3>Start</h3>${renderDecisionList(review.startDoing)}
    </section>
    <section class="panel">
      <h2>下月 OKR</h2>
      <ol>${review.nextMonthOKRs.map((okr) => `<li><strong>${escapeHtml(okr.objective)}</strong><ul>${okr.keyResults.map((kr) => `<li>${escapeHtml(kr.title)}</li>`).join("")}</ul></li>`).join("") || "<li>暂无 OKR。</li>"}</ol>
    </section>
    <section class="panel">
      <h2>Codex Tasks</h2>
      ${renderDecisionList(review.codexTasks)}
    </section>
    <section class="panel">
      <h2>数据缺口</h2>
      <ul>${review.dataGaps.map((gap) => `<li class="warning">${escapeHtml(gap)}</li>`).join("") || "<li>暂无。</li>"}</ul>
    </section>
  </main>
</body>
</html>`;
}

function renderDecisionList(items: Array<{ title: string; reason: string; priority: string }>) {
  if (!items.length) return "<ul><li>暂无。</li></ul>";
  return `<ul>${items.map((item) => `<li><strong>[${escapeHtml(item.priority)}] ${escapeHtml(item.title)}</strong><br><span class="muted">${escapeHtml(item.reason)}</span></li>`).join("")}</ul>`;
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
