import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  buildSyntheticFailureScenario,
  readSyntheticFailureScenarioStatusForDate
} from "../synthetic-failure-scenario-builder";
import { renderSyntheticOptimizationImplementationMarkdown } from "../synthetic-scenario-markdown";
import type { EbosSyntheticOptimizationImplementation } from "../synthetic-scenario-types";

describe("synthetic optimization implementation", () => {
  test("reads implementation status without creating real external signals", async () => {
    const root = await mkdtemp(join(tmpdir(), "ebos-synthetic-"));
    const reportsRoot = join(root, "reports", "ebos");
    const simulationsDir = join(reportsRoot, "external-publishing", "simulations");
    const targetDate = "2026-07-03";
    const scenario = buildSyntheticFailureScenario({
      targetDate,
      now: "2026-07-06T00:00:00.000Z"
    });
    const implementation: EbosSyntheticOptimizationImplementation = {
      reportType: "synthetic_optimization_implementation",
      targetDate,
      generatedAt: "2026-07-06T01:00:00.000Z",
      synthetic: true,
      implementedFixes: ["Added free sample module"],
      filesChanged: ["src/components/validation-ai-prompt-kit-page.tsx"],
      ctaChanges: ["Changed primary CTA to free sample prompts"],
      offerChanges: ["Clarified 100+ prompt templates"],
      pricingTestChanges: ["Added 0/19/49/99 pricing validation"],
      copywritingChanges: ["Updated private outreach"],
      remainingRisks: ["No real external channel data yet"],
      nextRealValidationPlan: ["Publish one real Xiaohongshu note"],
      warnings: ["Do not backfill as real data."]
    };

    try {
      await mkdir(simulationsDir, { recursive: true });
      await writeFile(join(simulationsDir, `${targetDate}-synthetic-failure-scenario.json`), `${JSON.stringify(scenario, null, 2)}\n`, "utf8");
      await writeFile(join(simulationsDir, `${targetDate}-synthetic-optimization-implementation.json`), `${JSON.stringify(implementation, null, 2)}\n`, "utf8");

      const status = await readSyntheticFailureScenarioStatusForDate({ targetDate, reportsRoot });

      expect(status.synthetic).toBe(true);
      expect(status.simulatedRevenue).toBe(0);
      expect(status.simulatedPaidOrders).toBe(0);
      expect(status.optimizationImplementationCompleted).toBe(true);
      expect(status.implementedFixesCount).toBe(1);
      expect(status.nextRealValidationActionsCount).toBe(1);
      expect(status.summary).toContain("next step is real publishing validation");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("renders implementation report markdown", () => {
    const markdown = renderSyntheticOptimizationImplementationMarkdown({
      reportType: "synthetic_optimization_implementation",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-06T01:00:00.000Z",
      synthetic: true,
      implementedFixes: ["Added pricing validation"],
      filesChanged: ["src/components/validation-ai-prompt-kit-page.tsx"],
      ctaChanges: ["Get 5 free sample prompts"],
      offerChanges: ["100+ prompt templates"],
      pricingTestChanges: ["CNY 0/19/49/99"],
      copywritingChanges: ["Private outreach rewritten"],
      remainingRisks: ["Production page pending redeploy"],
      nextRealValidationPlan: ["Collect only real external signals"],
      warnings: ["Do not use as revenue evidence."]
    });

    expect(markdown).toContain("Synthetic Optimization Implementation");
    expect(markdown).toContain("Added pricing validation");
    expect(markdown).toContain("Collect only real external signals");
  });
});
