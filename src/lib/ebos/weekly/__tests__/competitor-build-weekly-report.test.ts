import { describe, expect, test } from "vitest";
import {
  createEmptyWeeklySnapshot,
  type EbosWeeklyDataAdapter
} from "../../adapters/adapter-types";
import { createDataSourceState } from "../../data-source";
import type { EbosEvidenceCatalogEntry } from "../../evidence";
import { buildWeeklyEbosReport } from "../build-weekly-report";

function adapter(): EbosWeeklyDataAdapter {
  return {
    key: "internal_database",
    readWeeklySnapshot: async () => ({
      dataSource: createDataSourceState("internal_database", "available"),
      snapshot: createEmptyWeeklySnapshot(),
      warnings: []
    })
  };
}

function competitorEntry(): EbosEvidenceCatalogEntry {
  return {
    id: "competitor_evidence:2026-07-03:2026-07-03-competitor_evidence.json",
    filePath: "reports/ebos/evidence/competitor_evidence/2026-07-03-competitor_evidence.json",
    fileName: "2026-07-03-competitor_evidence.json",
    evidenceKind: "competitor_evidence",
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    generator: "scripts/generate-ebos-competitor-evidence.ts",
    score: 74,
    confidence: "partial",
    dataCompleteness: "partial",
    warningsCount: 1,
    errorsCount: 0,
    actionItemsCount: 1,
    validationStatus: "valid_with_warnings",
    payloadSummary: {
      summaryType: "competitor_evidence",
      overallScore: 74,
      competitorsCount: 9,
      competitorsAuditedCount: 0,
      includeNetworkSources: false,
      pagesAttempted: 0,
      pagesSucceeded: 0,
      pagesFailed: 0,
      opportunitiesCount: 2,
      topDifferentiationOpportunities: [
        {
          title: "Validate AI Agent workflow differentiation",
          priorityScore: 78,
          recommendedAction: "validate_first"
        }
      ],
      actionItemsCount: 1,
      confidence: "partial"
    },
    warnings: [{
      code: "manual_competitor_seed",
      severity: "warning",
      message: "manual competitor seeds are observation targets.",
      source: "manual_input"
    }],
    actionItems: [{
      id: "competitor-ai-agent-validation",
      title: "Validate AI Agent workflow differentiation",
      description: "Use competitor evidence to validate a low-cost differentiated offer before building deeply.",
      priority: "high",
      owner: "codex",
      relatedSection: "competitor",
      status: "open"
    }]
  };
}

describe("weekly report competitor evidence catalog integration", () => {
  test("uses competitor evidence catalog entries for the competitor section and next-week plan", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [adapter()],
      evidenceCatalogEntries: [competitorEntry()]
    });
    const competitor = result.report.sections.find((section) => section.key === "competitor");

    expect(competitor?.score).toBe(74);
    expect(competitor?.confidence).toBe("partial");
    expect(competitor?.findings.some((finding) => finding.includes("competitor_evidence"))).toBe(true);
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("AI Agent workflow differentiation"))).toBe(true);
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("public competitor URL audit"))).toBe(true);
  });

  test("uses audited competitor public page status when competitors were audited", async () => {
    const result = await buildWeeklyEbosReport({
      targetDate: new Date(2026, 6, 2, 10, 0),
      adapters: [adapter()],
      evidenceCatalogEntries: [competitorEntryWithPublicAudit()]
    });
    const competitor = result.report.sections.find((section) => section.key === "competitor");

    expect(competitor?.findings).toContainEqual(expect.stringContaining("competitorsAuditedCount=2"));
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("public competitor URL audit"))).toBe(false);
    expect(result.nextWeekPlan.actionItems.some((item) => item.title.includes("AI Prompt Kit page differentiation"))).toBe(true);
  });
});

function competitorEntryWithPublicAudit(): EbosEvidenceCatalogEntry {
  return {
    ...competitorEntry(),
    score: 82,
    confidence: "complete",
    dataCompleteness: "complete",
    warningsCount: 0,
    validationStatus: "valid",
    payloadSummary: {
      summaryType: "competitor_evidence",
      overallScore: 82,
      competitorsCount: 3,
      competitorsAuditedCount: 2,
      includeNetworkSources: true,
      pagesAttempted: 4,
      pagesSucceeded: 4,
      pagesFailed: 0,
      opportunitiesCount: 1,
      topDifferentiationOpportunities: [
        {
          title: "Validate AI Prompt Kit page differentiation",
          priorityScore: 82,
          recommendedAction: "validate_first"
        }
      ],
      actionItemsCount: 1,
      confidence: "complete"
    },
    warnings: [],
    actionItems: [{
      id: "competitor-prompt-kit-validation",
      title: "Validate AI Prompt Kit page differentiation",
      description: "Use audited competitor pricing, FAQ, and CTA signals to scope a validation page.",
      priority: "high",
      owner: "codex",
      relatedSection: "competitor",
      status: "open"
    }]
  };
}
