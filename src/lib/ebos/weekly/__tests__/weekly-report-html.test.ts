import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { renderWeeklyReportHtml } from "../weekly-report-html";
import { generateNextWeekPlan } from "../weekly-report-plan";

describe("renderWeeklyReportHtml", () => {
  test("renders a standalone HTML report with score, section cards, and next plan", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 10, 0));
    const html = renderWeeklyReportHtml(report, generateNextWeekPlan(report));

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("score-card");
    expect(html).toContain("section-card");
    expect(html).toContain("next-week-plan");
    expect(html).not.toContain("<script");
  });
});

