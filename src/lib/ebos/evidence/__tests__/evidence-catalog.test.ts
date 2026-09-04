import { describe, expect, test } from "vitest";
import type { EbosEvidenceEnvelope } from "../evidence-contract";
import {
  createEvidenceCatalogEntry,
  createEmptyEvidenceCatalog
} from "../evidence-catalog";

function validEnvelope(): EbosEvidenceEnvelope<{ score: { score: number; grade: string } }> {
  return {
    meta: {
      contractVersion: "ebos-evidence-v1",
      evidenceKind: "health_snapshot",
      generatedAt: "2026-07-03T00:00:00.000Z",
      targetDate: "2026-07-03",
      environment: "production",
      generator: "unit-test"
    },
    quality: {
      score: 91,
      grade: "excellent",
      confidence: "complete",
      dataCompleteness: "complete",
      warningsCount: 0,
      errorsCount: 0
    },
    payload: {
      score: {
        score: 91,
        grade: "excellent"
      }
    },
    warnings: [],
    actionItems: []
  };
}

describe("evidence catalog", () => {
  test("creates an empty catalog with the v1 catalog version", () => {
    const catalog = createEmptyEvidenceCatalog({
      generatedAt: "2026-07-03T00:00:00.000Z",
      rootDir: "reports/ebos/evidence"
    });

    expect(catalog.catalogVersion).toBe("ebos-evidence-catalog-v1");
    expect(catalog.totalEntries).toBe(0);
    expect(catalog.entries).toEqual([]);
    expect(catalog.summary.byKind).toEqual({});
    expect(catalog.summary.missingKinds).toContain("weekly_report");
  });

  test("creates a complete catalog entry from a valid envelope", () => {
    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/health_snapshot/2026-07-03-health_snapshot.json",
      validEnvelope()
    );

    expect(entry).toMatchObject({
      fileName: "2026-07-03-health_snapshot.json",
      evidenceKind: "health_snapshot",
      contractVersion: "ebos-evidence-v1",
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      siteUrl: undefined,
      environment: "production",
      generator: "unit-test",
      score: 91,
      grade: "excellent",
      confidence: "complete",
      dataCompleteness: "complete",
      warningsCount: 0,
      errorsCount: 0,
      actionItemsCount: 0,
      validationStatus: "valid"
    });
    expect(entry.id).toBe("health_snapshot:2026-07-03:2026-07-03-health_snapshot.json");
    expect(entry.payloadSummary).toMatchObject({
      score: 91,
      grade: "excellent"
    });
  });

  test("invalid envelopes become invalid entries without crashing", () => {
    const envelope = validEnvelope() as unknown as EbosEvidenceEnvelope<unknown>;
    envelope.meta.contractVersion = "bad-version" as never;

    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/health_snapshot/2026-07-03-health_snapshot.json",
      envelope
    );

    expect(entry.validationStatus).toBe("invalid");
    expect(entry.validationIssues?.some((issue) => issue.path === "meta.contractVersion")).toBe(true);
    expect(entry.payloadSummary).toBeUndefined();
  });

  test("catalog summary structure is stable", () => {
    const catalog = createEmptyEvidenceCatalog({
      generatedAt: "2026-07-03T00:00:00.000Z",
      rootDir: "reports/ebos/evidence"
    });

    expect(catalog.summary).toEqual(expect.objectContaining({
      byKind: expect.any(Object),
      byConfidence: expect.any(Object),
      byValidationStatus: expect.any(Object),
      latestByKind: expect.any(Object),
      missingKinds: expect.any(Array),
      averageScore: null,
      criticalWarningsCount: 0,
      openActionItemsCount: 0,
      dateRange: null
    }));
  });

  test("summarizes seo_evidence payloads", () => {
    const envelope = {
      ...validEnvelope(),
      meta: {
        ...validEnvelope().meta,
        evidenceKind: "seo_evidence" as const
      },
      payload: {
        overallScore: 72,
        pagesAudited: 8,
        confidence: "partial",
        risks: ["Missing product schema"],
        actionItems: [{ id: "seo-1", title: "Add Product schema", status: "open" }]
      }
    };

    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/seo_evidence/2026-07-03-seo_evidence.json",
      envelope
    );

    expect(entry.payloadSummary).toMatchObject({
      summaryType: "seo_evidence",
      overallScore: 72,
      pagesAudited: 8,
      technicalRisksCount: 1,
      actionItemsCount: 1,
      confidence: "partial"
    });
  });

  test("summarizes geo_evidence payloads", () => {
    const envelope = {
      ...validEnvelope(),
      meta: {
        ...validEnvelope().meta,
        evidenceKind: "geo_evidence" as const
      },
      payload: {
        overallScore: 68,
        pagesAudited: 4,
        confidence: "partial",
        pageAudits: [
          { citationReadinessScore: 80 },
          { citationReadinessScore: 40 }
        ],
        actionItems: [{ id: "geo-1", title: "Add FAQ", status: "open" }]
      }
    };

    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/geo_evidence/2026-07-03-geo_evidence.json",
      envelope
    );

    expect(entry.payloadSummary).toMatchObject({
      summaryType: "geo_evidence",
      overallScore: 68,
      pagesAudited: 4,
      citationReadinessAverage: 60,
      actionItemsCount: 1,
      confidence: "partial"
    });
  });

  test("summarizes product_evidence payloads", () => {
    const envelope = {
      ...validEnvelope(),
      meta: {
        ...validEnvelope().meta,
        evidenceKind: "product_evidence" as const
      },
      payload: {
        overallScore: 71,
        productsAudited: 3,
        confidence: "partial",
        risks: ["Missing delivery info"],
        actionItems: [{ id: "product-1", title: "Add delivery copy", status: "open" }],
        databaseSummary: {
          totalProducts: 5,
          publishedProducts: 4,
          draftProducts: 1
        }
      }
    };

    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/product_evidence/2026-07-03-product_evidence.json",
      envelope
    );

    expect(entry.payloadSummary).toMatchObject({
      summaryType: "product_evidence",
      overallScore: 71,
      productsAudited: 3,
      conversionRisksCount: 1,
      actionItemsCount: 1,
      confidence: "partial",
      databaseSummary: {
        totalProducts: 5,
        publishedProducts: 4,
        draftProducts: 1
      }
    });
  });

  test("summarizes revenue_evidence payloads", () => {
    const envelope = {
      ...validEnvelope(),
      meta: {
        ...validEnvelope().meta,
        evidenceKind: "revenue_evidence" as const
      },
      payload: {
        overallScore: 52,
        confidence: "partial",
        revenueSummary: {
          grossRevenue: 120,
          netRevenue: 100,
          firstRevenueAchieved: true
        },
        orderSummary: {
          totalOrders: 3,
          paidOrders: 2
        },
        productRevenueSummary: {
          productMetrics: [
            { productSlug: "video-tool", netRevenue: 100, paidOrdersCount: 2 }
          ]
        },
        actionItems: [{ id: "revenue-1", title: "Scale paid product", status: "open" }]
      }
    };

    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/revenue_evidence/2026-07-03-revenue_evidence.json",
      envelope
    );

    expect(entry.payloadSummary).toMatchObject({
      summaryType: "revenue_evidence",
      overallScore: 52,
      grossRevenue: 120,
      netRevenue: 100,
      totalOrders: 3,
      paidOrders: 2,
      firstRevenueAchieved: true,
      actionItemsCount: 1,
      confidence: "partial"
    });
    expect(entry.payloadSummary?.topProductRevenueMetrics).toEqual([
      { productSlug: "video-tool", netRevenue: 100, paidOrdersCount: 2 }
    ]);
  });

  test("summarizes market_evidence payloads", () => {
    const envelope = {
      ...validEnvelope(),
      meta: {
        ...validEnvelope().meta,
        evidenceKind: "market_evidence" as const
      },
      payload: {
        overallScore: 76,
        confidence: "partial",
        signals: [
          { id: "signal-1" },
          { id: "signal-2" }
        ],
        recommendedProductDirections: [
          {
            productDirection: "AI 视频工作流包",
            priorityScore: 82,
            recommendedAction: "validate_first"
          },
          {
            productDirection: "AI Agent Prompt Kit",
            priorityScore: 78,
            recommendedAction: "create_content_first"
          }
        ],
        actionItems: [{ id: "market-1", title: "验证 AI 视频工作流包", status: "open" }]
      }
    };

    const entry = createEvidenceCatalogEntry(
      "reports/ebos/evidence/market_evidence/2026-07-03-market_evidence.json",
      envelope
    );

    expect(entry.payloadSummary).toMatchObject({
      summaryType: "market_evidence",
      overallScore: 76,
      signalsCount: 2,
      recommendedProductDirectionsCount: 2,
      actionItemsCount: 1,
      confidence: "partial"
    });
    expect(entry.payloadSummary?.topProductDirections).toEqual([
      {
        productDirection: "AI 视频工作流包",
        priorityScore: 82,
        recommendedAction: "validate_first"
      },
      {
        productDirection: "AI Agent Prompt Kit",
        priorityScore: 78,
        recommendedAction: "create_content_first"
      }
    ]);
  });
});
