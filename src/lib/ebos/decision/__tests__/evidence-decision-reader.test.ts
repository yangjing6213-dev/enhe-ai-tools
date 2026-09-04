import { describe, expect, test, vi } from "vitest";
import type { EbosEvidenceCatalog, EbosEvidenceCatalogEntry, EbosEvidenceEnvelope } from "../../evidence";
import {
  buildDecisionInputFromCatalog,
  getEvidencePayloadByKind,
  readDecisionEvidence
} from "../evidence-decision-reader";

function entry(kind: EbosEvidenceCatalogEntry["evidenceKind"], filePath = `${kind}.json`): EbosEvidenceCatalogEntry {
  return {
    id: `${kind}:2026-07-03:${filePath}`,
    filePath,
    fileName: filePath,
    evidenceKind: kind,
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    generator: "unit-test",
    score: 70,
    confidence: "partial",
    warningsCount: kind === "competitor_evidence" ? 1 : 0,
    errorsCount: 0,
    actionItemsCount: 0,
    validationStatus: kind === "competitor_evidence" ? "valid_with_warnings" : "valid",
    warnings: kind === "competitor_evidence"
      ? [{ code: "thin_public_audit", severity: "warning", message: "Thin public audit.", source: "market_research" }]
      : []
  };
}

function envelope(kind: EbosEvidenceCatalogEntry["evidenceKind"], payload: unknown): EbosEvidenceEnvelope<unknown> {
  return {
    meta: {
      contractVersion: "ebos-evidence-v1",
      evidenceKind: kind,
      generatedAt: "2026-07-03T00:00:00.000Z",
      targetDate: "2026-07-03",
      generator: "unit-test"
    },
    quality: {
      score: 70,
      confidence: "partial",
      dataCompleteness: "partial",
      warningsCount: 0,
      errorsCount: 0
    },
    payload,
    warnings: [],
    actionItems: []
  };
}

function catalog(entries: EbosEvidenceCatalogEntry[]): EbosEvidenceCatalog {
  return {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt: "2026-07-03T00:00:00.000Z",
    rootDir: "reports/ebos/evidence",
    totalEntries: entries.length,
    entries,
    summary: {
      byKind: {},
      byConfidence: {},
      byValidationStatus: {},
      latestByKind: Object.fromEntries(entries.map((item) => [item.evidenceKind, item])),
      missingKinds: [],
      averageScore: 70,
      criticalWarningsCount: 0,
      openActionItemsCount: 0,
      dateRange: { start: "2026-07-03", end: "2026-07-03" }
    }
  };
}

describe("evidence decision reader", () => {
  test("reads decision inputs from catalog entries without scanning report directories", async () => {
    const entries = [
      entry("market_evidence", "market.json"),
      entry("product_evidence", "product.json"),
      entry("revenue_evidence", "revenue.json"),
      entry("seo_evidence", "seo.json"),
      entry("geo_evidence", "geo.json"),
      entry("competitor_evidence", "competitor.json"),
      entry("weekly_report", "weekly.json"),
      entry("monthly_review", "monthly.json")
    ];
    const files = new Map([
      ["market.json", envelope("market_evidence", { recommendedProductDirections: [] })],
      ["product.json", envelope("product_evidence", { productAudits: [] })],
      ["revenue.json", envelope("revenue_evidence", { revenueSummary: { firstRevenueAchieved: false } })],
      ["seo.json", envelope("seo_evidence", { overallScore: 80 })],
      ["geo.json", envelope("geo_evidence", { overallScore: 75 })],
      ["competitor.json", envelope("competitor_evidence", { differentiationOpportunities: [] })],
      ["weekly.json", envelope("weekly_report", { report: {} })],
      ["monthly.json", envelope("monthly_review", { reportType: "monthly" })]
    ]);
    const fs = {
      readFile: vi.fn(async (filePath: string) => JSON.stringify(files.get(filePath))),
      readdir: vi.fn()
    };

    const result = await buildDecisionInputFromCatalog(catalog(entries), { fs });

    expect(result.input.marketEvidence).toBeTruthy();
    expect(result.input.monthlyReview).toBeTruthy();
    expect(result.evidenceUsed).toHaveLength(8);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "thin_public_audit" }));
    expect(fs.readFile).toHaveBeenCalledTimes(8);
    expect(fs.readdir).not.toHaveBeenCalled();
  });

  test("missing evidence becomes data gaps instead of crashing", async () => {
    const result = await buildDecisionInputFromCatalog(catalog([entry("market_evidence", "market.json")]), {
      fs: {
        readFile: async () => JSON.stringify(envelope("market_evidence", { recommendedProductDirections: [] }))
      }
    });

    expect(result.input.marketEvidence).toBeTruthy();
    expect(result.dataGaps).toEqual(expect.arrayContaining([
      expect.stringContaining("product_evidence"),
      expect.stringContaining("revenue_evidence"),
      expect.stringContaining("competitor_evidence")
    ]));
  });

  test("getEvidencePayloadByKind reads the envelope payload for a kind", async () => {
    const payload = await getEvidencePayloadByKind(catalog([entry("market_evidence", "market.json")]), "market_evidence", {
      fs: {
        readFile: async () => JSON.stringify(envelope("market_evidence", { recommendedProductDirections: [{ productDirection: "AI Prompt Kit" }] }))
      }
    });

    expect(payload).toMatchObject({
      recommendedProductDirections: [{ productDirection: "AI Prompt Kit" }]
    });
  });

  test("readDecisionEvidence defaults to latest catalog path and reads through catalog", async () => {
    const latest = catalog([entry("market_evidence", "market.json")]);
    const fs = {
      readFile: vi.fn(async (filePath: string) => filePath.endsWith("latest-evidence-catalog.json")
        ? JSON.stringify(latest)
        : JSON.stringify(envelope("market_evidence", { recommendedProductDirections: [] })))
    };

    const result = await readDecisionEvidence({ fs });

    expect(result.evidenceCatalogPath).toContain("latest-evidence-catalog.json");
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining("latest-evidence-catalog.json"), "utf8");
  });
});
