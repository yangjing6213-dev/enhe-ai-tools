import { describe, expect, test } from "vitest";
import { renderDecisionReportMarkdown } from "../decision-report-markdown";
import type { EbosDecisionReport } from "../decision-types";

function report(): EbosDecisionReport {
  return {
    reportType: "decision",
    targetDate: "2026-07-03",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generatedAt: "2026-07-03T00:00:00.000Z",
    evidenceCatalogPath: "reports/ebos/evidence/catalog/latest-evidence-catalog.json",
    evidenceUsed: [],
    overallConfidence: "partial",
    strategicSummary: "本周只验证 AI Prompt Kit，备选 AI Video Studio。",
    priorityProductDirections: [],
    priorityExistingProducts: [],
    validationPlans: [],
    stopDoing: [{ title: "Do not optimize UI endlessly", reason: "No revenue proof.", evidenceRefs: [] }],
    doNext: [{ title: "Validate AI Prompt Kit", reason: "Fast validation.", evidenceRefs: [] }],
    codexTasks: [{ id: "decision-task-1", title: "Draft AI Prompt Kit landing page", description: "Create one page.", priority: "high", owner: "codex", status: "open" }],
    risks: ["This report does not fabricate traffic, sales, or revenue."],
    warnings: [],
    dataGaps: ["Missing revenue details."]
  };
}

describe("decision report markdown", () => {
  test("renders the required 11 sections and explicit decision boundaries", () => {
    const markdown = renderDecisionReportMarkdown(report());

    expect(markdown).toContain("# ENHE Cross-Evidence Decision Report");
    for (const heading of [
      "## 1. 本周一句话决策",
      "## 2. 使用的 Evidence",
      "## 3. 优先验证产品方向",
      "## 4. 优先验证现有产品",
      "## 5. 推荐验证计划",
      "## 6. 本周只做什么",
      "## 7. 本周不要做什么",
      "## 8. Codex 执行任务",
      "## 9. 人工执行任务",
      "## 10. 风险与限制",
      "## 11. 下一步数据缺口"
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("不代表流量、销量或收入");
    expect(markdown).toContain("Validate AI Prompt Kit");
  });
});
