import { describe, expect, test } from "vitest";
import { createEmptyEbosReport } from "../../report-schema";
import { generateNextWeekPlan } from "../weekly-report-plan";

describe("weekly report plan competitor evidence integration", () => {
  test("promotes competitor evidence differentiation opportunities into weekly validation tasks", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 10, 0));
    report.sections = report.sections.map((section) => {
      if (section.key === "revenue" || section.key === "traffic" || section.key === "product") {
        return { ...section, score: 80, confidence: "complete" };
      }

      if (section.key === "seo" || section.key === "geo") {
        return { ...section, score: 85, confidence: "complete" };
      }

      if (section.key === "competitor") {
        return {
          ...section,
          score: 74,
          confidence: "partial",
          findings: ["competitor_evidence is available from reports/ebos/evidence/competitor_evidence/file.json."],
          actionItems: [
            {
              title: "Validate AI Agent workflow differentiation",
              priority: "high",
              sectionKey: "competitor",
              status: "open",
              verification: "Next competitor_evidence records validation results."
            }
          ]
        };
      }

      return section;
    });

    const plan = generateNextWeekPlan(report);

    expect(plan.actionItems).toContainEqual(expect.objectContaining({
      sectionKey: "competitor",
      title: expect.stringContaining("AI Agent workflow differentiation")
    }));
  });
});
