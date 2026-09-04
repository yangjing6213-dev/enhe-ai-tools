import { describe, expect, test } from "vitest";
import type { EbosEvidenceEnvelope } from "../evidence-contract";
import { createEvidenceCatalogEntry } from "../evidence-catalog";

function validCompetitorEnvelope(): EbosEvidenceEnvelope<unknown> {
  return {
    meta: {
      contractVersion: "ebos-evidence-v1",
      evidenceKind: "competitor_evidence",
      generatedAt: "2026-07-03T00:00:00.000Z",
      targetDate: "2026-07-03",
      periodStart: "2026-06-29",
      periodEnd: "2026-07-05",
      generator: "unit-test"
    },
    quality: {
      score: 74,
      confidence: "partial",
      dataCompleteness: "partial",
      warningsCount: 1,
      errorsCount: 0
    },
    payload: {
      overallScore: 74,
      confidence: "partial",
      competitorSummary: {
        competitorsCount: 9,
        competitorsAuditedCount: 3
      },
      dataSourceSummary: {
        networkSourcesEnabled: true,
        pagesAttempted: 6,
        pagesSucceeded: 5,
        pagesFailed: 1
      },
      differentiationOpportunities: [
        {
          title: "Validate AI Agent workflow template bundle",
          priorityScore: 78,
          recommendedAction: "validate_first"
        },
        {
          title: "Create SEO/GEO landing page comparison content",
          priorityScore: 64,
          recommendedAction: "create_content_first"
        }
      ],
      actionItems: [{
        id: "competitor-1",
        title: "Validate AI Agent workflow differentiation",
        status: "open"
      }]
    },
    warnings: [{
      code: "manual_competitor_seed",
      severity: "warning",
      message: "manual competitor seeds are observation targets.",
      source: "manual_input"
    }],
    actionItems: [{
      id: "competitor-1",
      title: "Validate AI Agent workflow differentiation",
      description: "Run a low-cost validation offer.",
      priority: "high",
      owner: "codex",
      status: "open"
    }]
  };
}

describe("competitor evidence catalog summary", () => {
  test("summarizes competitor_evidence payloads", () => {
    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/competitor_evidence/2026-07-03-competitor_evidence.json",
      validCompetitorEnvelope()
    );

    expect(entry.payloadSummary).toMatchObject({
      summaryType: "competitor_evidence",
      overallScore: 74,
      competitorsCount: 9,
      competitorsAuditedCount: 3,
      includeNetworkSources: true,
      pagesAttempted: 6,
      pagesSucceeded: 5,
      pagesFailed: 1,
      opportunitiesCount: 2,
      actionItemsCount: 1,
      confidence: "partial"
    });
    expect(entry.payloadSummary?.topDifferentiationOpportunities).toEqual([
      {
        title: "Validate AI Agent workflow template bundle",
        priorityScore: 78,
        recommendedAction: "validate_first"
      },
      {
        title: "Create SEO/GEO landing page comparison content",
        priorityScore: 64,
        recommendedAction: "create_content_first"
      }
    ]);
  });
});
