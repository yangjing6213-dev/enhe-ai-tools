import { describe, expect, test } from "vitest";
import type { EbosMonthlyReview } from "../monthly-review-types";
import { renderMonthlyReviewHtml } from "../monthly-review-html";

function review(): EbosMonthlyReview {
  return {
    reportType: "monthly",
    targetMonth: "2026-07",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    generatedAt: "2026-07-03T00:00:00.000Z",
    evidenceCatalogPath: "reports/ebos/evidence/catalog/latest-evidence-catalog.json",
    evidenceUsed: [{ catalogEntryId: "weekly:1", evidenceKind: "weekly_report", targetDate: "2026-07-03", score: 57, confidence: "partial", filePath: "weekly.json" }],
    overallScore: 57,
    confidence: "partial",
    executiveSummary: "样本不足，先补证据链。",
    strategicFindings: [],
    majorWins: [],
    majorRisks: [],
    failedAssumptions: [],
    growthOpportunities: [],
    stopDoing: [],
    keepDoing: [],
    startDoing: [],
    nextMonthOKRs: [],
    codexTasks: [],
    dataGaps: [],
    warnings: [],
    actionItems: []
  };
}

describe("renderMonthlyReviewHtml", () => {
  test("renders standalone html with score card and evidence section", () => {
    const html = renderMonthlyReviewHtml(review());

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("score-card");
    expect(html).toContain("Evidence 使用情况");
    expect(html).not.toContain("<script");
  });
});
