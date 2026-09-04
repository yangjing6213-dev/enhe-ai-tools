import { describe, expect, test } from "vitest";
import type { EbosMonthlyReview } from "../monthly-review-types";
import { renderMonthlyReviewMarkdown } from "../monthly-review-markdown";

function review(): EbosMonthlyReview {
  return {
    reportType: "monthly",
    targetMonth: "2026-07",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    generatedAt: "2026-07-03T00:00:00.000Z",
    evidenceCatalogPath: "reports/ebos/evidence/catalog/latest-evidence-catalog.json",
    evidenceUsed: [],
    overallScore: null,
    confidence: "unknown",
    executiveSummary: "当前 evidence 样本不足，不能伪造收入、流量或订单结论。",
    strategicFindings: [],
    majorWins: [],
    majorRisks: [],
    failedAssumptions: [],
    growthOpportunities: [],
    stopDoing: [{ title: "停止用感觉替代证据", reason: "样本不足", evidenceRefs: [], priority: "high", owner: "human" }],
    keepDoing: [{ title: "保持 EBOS 测试健康", reason: "技术健康基础", evidenceRefs: [], priority: "medium", owner: "codex" }],
    startDoing: [{ title: "补齐经营证据链", reason: "样本不足", evidenceRefs: [], priority: "critical", owner: "codex" }],
    nextMonthOKRs: [{ objective: "补齐经营证据链", keyResults: [{ title: "生成 monthly_review evidence", target: 1, unit: "evidence", status: "not_started" }] }],
    codexTasks: [{ title: "接入 SEO/GEO 数据源", reason: "缺少证据", evidenceRefs: [], priority: "high", owner: "codex" }],
    dataGaps: ["样本不足"],
    warnings: [{ code: "partial_data", severity: "warning", message: "样本不足" }],
    actionItems: [{ id: "a1", title: "补齐经营证据链", description: "建立证据", priority: "critical", owner: "codex", status: "open" }]
  };
}

describe("renderMonthlyReviewMarkdown", () => {
  test("renders the 12 required headings", () => {
    const markdown = renderMonthlyReviewMarkdown(review());

    for (const heading of [
      "## 1. 本月一句话结论",
      "## 2. 本月经营评分",
      "## 3. Evidence 使用情况",
      "## 4. 本月主要进展",
      "## 5. 本月主要风险",
      "## 6. 本月失败假设",
      "## 7. 增长机会",
      "## 8. Stop / Keep / Start",
      "## 9. 下月 OKR",
      "## 10. Codex 下月执行任务",
      "## 11. 数据缺口",
      "## 12. 战略建议"
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  test("states when evidence is insufficient and includes Stop/Keep/Start and OKR", () => {
    const markdown = renderMonthlyReviewMarkdown(review());

    expect(markdown).toContain("样本不足");
    expect(markdown).toContain("Stop");
    expect(markdown).toContain("Keep");
    expect(markdown).toContain("Start");
    expect(markdown).toContain("补齐经营证据链");
  });
});
