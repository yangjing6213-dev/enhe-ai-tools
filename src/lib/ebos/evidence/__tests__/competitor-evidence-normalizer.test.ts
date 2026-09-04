import { describe, expect, test } from "vitest";
import { wrapCompetitorEvidence } from "../evidence-normalizer";

describe("competitor evidence normalizer", () => {
  test("wraps competitor evidence into an envelope", () => {
    const envelope = wrapCompetitorEvidence({
      overallScore: 74,
      confidence: "partial",
      warnings: [{
        code: "manual_competitor_seed",
        severity: "warning",
        message: "manual seeds are observation targets",
        source: "manual_input"
      }],
      actionItems: [{
        title: "Validate AI Agent workflow differentiation",
        priority: "high",
        status: "open"
      }]
    }, {
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      generator: "unit-test"
    });

    expect(envelope.meta.evidenceKind).toBe("competitor_evidence");
    expect(envelope.meta.periodStart).toBe("2026-06-29");
    expect(envelope.meta.periodEnd).toBe("2026-07-05");
    expect(envelope.quality.score).toBe(74);
    expect(envelope.quality.confidence).toBe("partial");
    expect(envelope.warnings).toHaveLength(1);
    expect(envelope.actionItems[0]?.title).toContain("AI Agent");
  });
});
