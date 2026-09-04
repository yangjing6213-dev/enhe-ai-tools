import { describe, expect, test } from "vitest";
import { DEFAULT_EBOS_SECTION_KEYS } from "../constants";
import { createDataSourceState } from "../data-source";
import { createEmptyEbosReport, createEmptySection, validateEbosReport } from "../report-schema";
import {
  createLowConfidenceWarning,
  createMissingDataWarning,
  createNoRevenueWarning,
  createPartialDataWarning
} from "../warnings";

describe("EBOS report schema", () => {
  test("creates an empty section with all required report arrays", () => {
    const section = createEmptySection("revenue");

    expect(section).toMatchObject({
      key: "revenue",
      score: null,
      confidence: "unknown",
      findings: [],
      risks: [],
      opportunities: [],
      actionItems: [],
      warnings: []
    });
  });

  test("creates weekly and monthly empty reports with default EBOS sections", () => {
    const weekly = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 12, 0));
    const monthly = createEmptyEbosReport("monthly", new Date(2026, 6, 2, 12, 0));

    expect(weekly.type).toBe("weekly");
    expect(weekly.period.start).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0));
    expect(monthly.period.start).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0));
    expect(weekly.sections.map((section) => section.key)).toEqual(DEFAULT_EBOS_SECTION_KEYS);
    expect(weekly.overallScore).toBeNull();
    expect(weekly.confidence).toBe("unknown");
  });

  test("validates complete report shape and flags missing required section fields", () => {
    const report = createEmptyEbosReport("weekly", new Date(2026, 6, 2, 12, 0));
    report.sections[0] = {
      ...report.sections[0],
      score: 80,
      confidence: "complete",
      dataSources: [createDataSourceState("internal_database", "available")]
    };

    expect(validateEbosReport(report)).toEqual({ valid: true, errors: [] });

    const brokenReport = {
      ...report,
      sections: [{ key: "revenue", score: 80 }]
    };

    expect(validateEbosReport(brokenReport).valid).toBe(false);
    expect(validateEbosReport(brokenReport).errors).toContain("sections[0].findings must be an array");
  });

  test("creates standard warning objects for missing, partial, revenue, and confidence issues", () => {
    expect(createMissingDataWarning("google_search_console")).toMatchObject({
      code: "missing_data",
      source: "google_search_console",
      severity: "warning"
    });
    expect(createPartialDataWarning("google_analytics")).toMatchObject({
      code: "partial_data",
      source: "google_analytics",
      severity: "warning"
    });
    expect(createNoRevenueWarning()).toMatchObject({
      code: "no_revenue",
      section: "revenue",
      severity: "critical"
    });
    expect(createLowConfidenceWarning("geo")).toMatchObject({
      code: "low_confidence",
      section: "geo",
      severity: "warning"
    });
  });
});

