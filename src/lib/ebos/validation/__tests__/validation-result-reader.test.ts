import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  mergeTrackerWithResultInput,
  normalizeValidationResultInput,
  readValidationResultInputForDate,
  readValidationResultInput
} from "../validation-result-reader";
import type { EbosValidationTracker } from "../validation-types";

const tempDirs: string[] = [];

async function tempFile(content: string) {
  const dir = await mkdtemp(join(tmpdir(), "ebos-validation-"));
  tempDirs.push(dir);
  const filePath = join(dir, "input.json");
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function tracker(): EbosValidationTracker {
  return {
    trackerType: "validation_tracker",
    targetDate: "2026-07-03",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generatedAt: "2026-07-03T00:00:00.000Z",
    decisionReportPath: "reports/ebos/decision/2026-07-03-decision-report.json",
    topPriorityDirection: "AI Prompt Kit",
    validationPlans: [{
      id: "plan-1",
      title: "Validate AI Prompt Kit",
      targetDirection: "AI Prompt Kit",
      objective: "Validate demand.",
      hypothesis: "Users will click.",
      validationMethod: "landing_page",
      successMetric: "CTA clicks.",
      minimumSuccessThreshold: "CTA clicks >= 10",
      durationDays: 7,
      requiredAssets: [],
      codexTasks: [],
      humanTasks: [],
      risks: [],
      resultInput: { planId: "plan-1", status: "not_started" }
    }],
    instructions: [],
    manualInputSchema: { results: [] },
    warnings: []
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("validation result reader", () => {
  test("reads complete result input from JSON", async () => {
    const filePath = await tempFile(JSON.stringify({
      results: [{
        planId: "plan-1",
        status: "completed",
        ctaClicks: 12,
        leads: 4,
        paidOrders: 1,
        revenue: 99
      }]
    }));

    const result = await readValidationResultInput(filePath);

    expect(result.input.results[0]).toMatchObject({
      planId: "plan-1",
      status: "completed",
      ctaClicks: 12,
      paidOrders: 1
    });
    expect(result.warnings).toEqual([]);
  });

  test("normalizes incomplete input without crashing", () => {
    const normalized = normalizeValidationResultInput({
      results: [{ planId: "plan-1", status: "completed", ctaClicks: "8", leads: null }]
    });

    expect(normalized.results[0]).toMatchObject({
      planId: "plan-1",
      status: "completed",
      ctaClicks: 8
    });
    expect(normalized.results[0]?.leads).toBeUndefined();
  });

  test("returns warning for corrupted JSON instead of throwing", async () => {
    const filePath = await tempFile("{bad json");

    const result = await readValidationResultInput(filePath);

    expect(result.input.results).toEqual([]);
    expect(result.warnings[0]?.code).toBe("validation_input_parse_failed");
  });

  test("empty input is not treated as failed", () => {
    const normalized = normalizeValidationResultInput({});
    const merged = mergeTrackerWithResultInput(tracker(), normalized);

    expect(normalized.results).toEqual([]);
    expect(merged.validationPlans[0]?.resultInput.status).toBe("not_started");
  });

  test("can persist normalized input shape as editable JSON", async () => {
    const normalized = normalizeValidationResultInput([{ planId: "plan-1", status: "running", ctaClicks: 3 }]);
    const filePath = await tempFile(JSON.stringify(normalized, null, 2));
    const saved = JSON.parse(await readFile(filePath, "utf8"));

    expect(saved.results[0]).toMatchObject({ planId: "plan-1", status: "running", ctaClicks: 3 });
  });

  test("prefers real dated validation input over example input", async () => {
    const result = await readValidationResultInputForDate({
      targetDate: "2026-07-03",
      fs: {
        readFile: async (filePath: string) => {
          if (filePath.endsWith("2026-07-03-validation-input.json")) {
            return JSON.stringify({ results: [{ planId: "plan-1", status: "completed", paidOrders: 1 }] });
          }
          return JSON.stringify({ results: [{ planId: "plan-1", status: "not_started" }] });
        }
      }
    });

    expect(result.filePath).toBe("reports/ebos/validation/inputs/2026-07-03-validation-input.json");
    expect(result.usedExample).toBe(false);
    expect(result.input.results[0]?.paidOrders).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  test("falls back to example input with warning when real input is missing", async () => {
    const result = await readValidationResultInputForDate({
      targetDate: "2026-07-03",
      fs: {
        readFile: async (filePath: string) => {
          if (filePath.endsWith("2026-07-03-validation-input.example.json")) {
            return JSON.stringify({ results: [{ planId: "plan-1", status: "not_started" }] });
          }
          throw new Error("missing");
        }
      }
    });

    expect(result.filePath).toBe("reports/ebos/validation/inputs/2026-07-03-validation-input.example.json");
    expect(result.usedExample).toBe(true);
    expect(result.warnings[0]?.message).toContain("example");
    expect(result.input.results[0]?.status).toBe("not_started");
  });
});
