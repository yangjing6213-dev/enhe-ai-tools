import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";
import { renderWeeklyReportMarkdown } from "../weekly-report-markdown";

describe("renderWeeklyReportMarkdown", () => {
  test("renders the required report shell", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 10, 0));
    const markdown = renderWeeklyReportMarkdown(report, generateNextWeekPlan(report));

    expect(markdown).toContain("# ENHE Weekly Business Review");
    expect(markdown).toContain("## 11.");
    expect(markdown).toContain("## 12.");
    expect(markdown).toContain("## 13.");
    expect(markdown).toContain("## 14.");
  });

  test("renders local business dates instead of UTC-shifted dates", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 10, 0));
    const markdown = renderWeeklyReportMarkdown(report, generateNextWeekPlan(report));

    expect(markdown).toContain("2026-06-29");
    expect(markdown).toContain("2026-07-05");
    expect(markdown).not.toContain("2026-06-28");
  });

  test("includes EBOS product URL source data gap recommendations", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 10, 0));
    const markdown = renderWeeklyReportMarkdown(report, generateNextWeekPlan(report));

    expect(markdown).toContain("EBOS_SITE_URL");
    expect(markdown).toContain("DATABASE_URL");
    expect(markdown).toContain("sitemap");
  });
});
