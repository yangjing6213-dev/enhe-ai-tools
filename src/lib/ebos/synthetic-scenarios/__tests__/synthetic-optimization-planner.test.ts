import { describe, expect, test } from "vitest";
import { buildSyntheticFailureScenario } from "../synthetic-failure-scenario-builder";
import { analyzeSyntheticFailureScenario } from "../synthetic-failure-analyzer";
import { buildSyntheticOptimizationPlan } from "../synthetic-optimization-planner";

describe("buildSyntheticOptimizationPlan", () => {
  test("outputs priority fixes and next sprint actions as synthetic planning only", () => {
    const scenario = buildSyntheticFailureScenario({ targetDate: "2026-07-03" });
    const analysis = analyzeSyntheticFailureScenario(scenario);
    const plan = buildSyntheticOptimizationPlan(analysis, {
      now: "2026-07-06T00:00:00.000Z"
    });

    expect(plan.planType).toBe("synthetic_optimization_plan");
    expect(plan.synthetic).toBe(true);
    expect(plan.priorityFixes.length).toBeGreaterThanOrEqual(7);
    expect(plan.priorityFixes[0]).toContain("Hero");
    expect(plan.nextSprintActions.length).toBeGreaterThanOrEqual(7);
    expect(plan.warnings).toContain("Do not backfill as real data.");
  });
});

