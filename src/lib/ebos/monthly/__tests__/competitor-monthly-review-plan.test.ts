import { describe, expect, test } from "vitest";
import type { EbosEvidenceCatalogEntry } from "../../evidence";
import { generateMonthlyReviewPlan } from "../monthly-review-plan";

function entry(
  kind: EbosEvidenceCatalogEntry["evidenceKind"],
  overrides: Partial<EbosEvidenceCatalogEntry> = {}
): EbosEvidenceCatalogEntry {
  return {
    id: `${kind}:2026-07-03:file.json`,
    filePath: `reports/ebos/evidence/${kind}/file.json`,
    fileName: "file.json",
    evidenceKind: kind,
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    generator: "unit-test",
    score: 80,
    confidence: "partial",
    warningsCount: 0,
    errorsCount: 0,
    actionItemsCount: 0,
    validationStatus: "valid",
    ...overrides
  };
}

describe("monthly review plan competitor evidence integration", () => {
  test("adds competitor evidence OKR when competitor_evidence is missing", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [entry("weekly_report")],
      missingKinds: ["competitor_evidence"],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.nextMonthOKRs.some((okr) => okr.objective.includes("Competitor Evidence"))).toBe(true);
    expect(plan.codexTasks.some((task) => task.title.includes("competitor_evidence"))).toBe(true);
  });

  test("creates concrete competitor differentiation tasks when competitor evidence exists", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [
        entry("revenue_evidence", {
          payloadSummary: {
            firstRevenueAchieved: false,
            paidOrders: 0,
            netRevenue: 0
          }
        }),
        entry("market_evidence", {
          score: 76,
          payloadSummary: {
            topProductDirections: [
              {
                productDirection: "AI Agent 工作流模板包",
                priorityScore: 76,
                recommendedAction: "validate_first"
              }
            ]
          }
        }),
        entry("competitor_evidence", {
          score: 74,
          actionItemsCount: 1,
          payloadSummary: {
            competitorsAuditedCount: 2,
            includeNetworkSources: true,
            pagesAttempted: 4,
            pagesSucceeded: 4,
            pagesFailed: 0,
            opportunitiesCount: 2,
            topDifferentiationOpportunities: [
              {
                title: "Validate AI Agent workflow differentiation",
                priorityScore: 78,
                recommendedAction: "validate_first"
              }
            ]
          },
          actionItems: [{
            id: "competitor-1",
            title: "Validate AI Agent workflow differentiation",
            description: "Run a low-cost validation offer before building.",
            priority: "high",
            owner: "codex",
            status: "open"
          }]
        })
      ],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("Competitor evidence")
    }));
    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      reason: expect.stringContaining("low-cost validation")
    }));
  });

  test("asks for public URL audit when competitor evidence has no audited competitors", () => {
    const plan = generateMonthlyReviewPlan({
      evidenceEntries: [
        entry("competitor_evidence", {
          score: 69,
          confidence: "partial",
          payloadSummary: {
            competitorsAuditedCount: 0,
            includeNetworkSources: false,
            pagesAttempted: 0,
            pagesSucceeded: 0,
            pagesFailed: 0,
            topDifferentiationOpportunities: []
          }
        })
      ],
      missingKinds: [],
      openActionItemsCount: 0,
      sampleIsThin: false
    });

    expect(plan.codexTasks).toContainEqual(expect.objectContaining({
      title: expect.stringContaining("public competitor URL audit")
    }));
  });
});
