import { describe, expect, test } from "vitest";
import { buildSyntheticFailureScenario } from "../synthetic-failure-scenario-builder";
import { analyzeSyntheticFailureScenario } from "../synthetic-failure-analyzer";

describe("analyzeSyntheticFailureScenario", () => {
  test("outputs funnel diagnosis and likely failure reasons without claiming real data", () => {
    const scenario = buildSyntheticFailureScenario({ targetDate: "2026-07-03" });
    const analysis = analyzeSyntheticFailureScenario(scenario, {
      simulatedScenarioPath: "reports/ebos/external-publishing/simulations/2026-07-03-synthetic-failure-scenario.json",
      now: "2026-07-06T00:00:00.000Z"
    });

    expect(analysis.analysisType).toBe("synthetic_failure_analysis");
    expect(analysis.synthetic).toBe(true);
    expect(analysis.funnelDiagnosis).toEqual(expect.arrayContaining([
      expect.stringContaining("exposure low"),
      expect.stringContaining("lead zero"),
      expect.stringContaining("paid conversion zero")
    ]));
    expect(analysis.likelyFailureReasons.length).toBeGreaterThanOrEqual(9);
    expect(analysis.warnings).toContain("Do not backfill as real data.");
  });
});

