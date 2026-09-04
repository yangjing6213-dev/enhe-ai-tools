import { describe, expect, test } from "vitest";
import {
  buildValidationTrackerFromDecisionReport,
  createEmptyValidationResultInput
} from "../validation-template-builder";

function decisionReport() {
  return {
    reportType: "decision",
    targetDate: "2026-07-03",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generatedAt: "2026-07-03T00:00:00.000Z",
    evidenceCatalogPath: "catalog.json",
    evidenceUsed: [],
    overallConfidence: "partial",
    strategicSummary: "Focus on validation.",
    priorityProductDirections: [{ name: "AI Prompt Kit" }],
    priorityExistingProducts: [{ productName: "FaceSwap Studio" }],
    validationPlans: [{
      id: "validation-direction-1-ai-prompt-kit",
      title: "Validate AI Prompt Kit",
      targetDirection: "AI Prompt Kit",
      objective: "Validate demand.",
      hypothesis: "Users will click or buy.",
      validationMethod: "landing_page",
      successMetric: "CTA clicks, leads, or orders.",
      minimumSuccessThreshold: "CTA clicks >= 10 or leads >= 3 or presale orders >= 1.",
      durationDays: 7,
      requiredAssets: ["Landing page"],
      codexTasks: ["Draft page"],
      humanTasks: ["Review offer"],
      risks: ["Signals are directional."]
    }],
    stopDoing: [],
    doNext: [{ title: "Validate AI Prompt Kit", reason: "Top priority.", evidenceRefs: [] }],
    codexTasks: [],
    risks: [],
    warnings: [],
    dataGaps: []
  };
}

function fakeFs(files: Record<string, string>) {
  return {
    readFile: async (filePath: string) => files[filePath],
    readdir: async (directory: string) => Object.keys(files)
      .filter((filePath) => filePath.startsWith(`${directory}/`))
      .map((filePath) => filePath.slice(directory.length + 1))
  };
}

describe("validation template builder", () => {
  test("builds a tracker from the latest decision report", async () => {
    const tracker = await buildValidationTrackerFromDecisionReport({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T08:00:00.000Z",
      fs: fakeFs({
        "reports/ebos/decision/2026-07-03-decision-report.json": JSON.stringify(decisionReport())
      })
    });

    expect(tracker.trackerType).toBe("validation_tracker");
    expect(tracker.decisionReportPath).toBe("reports/ebos/decision/2026-07-03-decision-report.json");
    expect(tracker.topPriorityDirection).toBe("AI Prompt Kit");
    expect(tracker.topExistingProduct).toBe("FaceSwap Studio");
    expect(tracker.validationPlans).toHaveLength(1);
    expect(tracker.validationPlans[0]?.resultInput).toMatchObject({
      planId: "validation-direction-1-ai-prompt-kit",
      status: "not_started"
    });
    expect(tracker.instructions.join(" ")).toContain("manual");
  });

  test("does not crash when no decision report exists", async () => {
    const tracker = await buildValidationTrackerFromDecisionReport({
      targetDate: "2026-07-03",
      fs: fakeFs({})
    });

    expect(tracker.validationPlans).toEqual([]);
    expect(tracker.warnings).toContainEqual(expect.objectContaining({
      code: "decision_report_missing"
    }));
  });

  test("creates empty result input for every plan", () => {
    const input = createEmptyValidationResultInput(decisionReport().validationPlans[0]);

    expect(input).toEqual({
      planId: "validation-direction-1-ai-prompt-kit",
      status: "not_started"
    });
  });
});
