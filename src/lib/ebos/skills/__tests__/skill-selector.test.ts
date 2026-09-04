import { describe, expect, test } from "vitest";
import { selectEbosSkills } from "../skill-selector";

describe("selectEbosSkills", () => {
  test("selects SEO and GEO skills for no traffic problems", () => {
    const result = selectEbosSkills({
      problemType: "no_traffic",
      evidenceKindsAvailable: ["health_snapshot", "data_source_readiness"]
    });

    expect(result.selectedSkills.map((skill) => skill.id)).toEqual([
      "technical-seo-auditor",
      "geo-visibility-auditor"
    ]);
  });

  test("selects product management and conversion skills for no revenue problems", () => {
    const result = selectEbosSkills({
      problemType: "no_revenue",
      evidenceKindsAvailable: ["weekly_report", "monthly_review", "health_snapshot"]
    });

    expect(result.selectedSkills.map((skill) => skill.id)).toEqual([
      "growth-product-manager",
      "landing-page-conversion-auditor"
    ]);
  });

  test("selects opportunity research and product management skills for product opportunities", () => {
    const result = selectEbosSkills({
      problemType: "product_opportunity",
      evidenceKindsAvailable: ["monthly_review", "weekly_report"]
    });

    expect(result.selectedSkills.map((skill) => skill.id)).toEqual([
      "digital-product-researcher",
      "growth-product-manager"
    ]);
  });

  test("selects the evidence analyst for evidence gaps", () => {
    const result = selectEbosSkills({
      problemType: "evidence_gap",
      evidenceKindsAvailable: ["health_snapshot"]
    });

    expect(result.selectedSkills.map((skill) => skill.id)).toEqual([
      "ebos-evidence-analyst"
    ]);
  });

  test("selects the monthly strategy reviewer for monthly planning", () => {
    const result = selectEbosSkills({
      problemType: "monthly_planning",
      reportType: "monthly",
      evidenceKindsAvailable: ["monthly_review", "weekly_report"]
    });

    expect(result.selectedSkills.map((skill) => skill.id)).toEqual([
      "monthly-strategy-reviewer"
    ]);
  });

  test("returns missing evidence and next actions", () => {
    const result = selectEbosSkills({
      problemType: "weekly_planning",
      evidenceKindsAvailable: ["weekly_report"]
    });

    expect(result.missingEvidence).toEqual([
      "health_snapshot",
      "data_source_readiness"
    ]);
    expect(result.nextActions).toContain(
      "Generate or locate health_snapshot evidence before finalizing the selected skill output."
    );
    expect(result.nextActions).toContain(
      "Generate or locate data_source_readiness evidence before finalizing the selected skill output."
    );
  });
});
