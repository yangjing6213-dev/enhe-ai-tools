import { describe, expect, test } from "vitest";
import type {
  EbosEvidenceCatalog,
  EbosEvidenceCatalogEntry
} from "../evidence-catalog-types";
import {
  getEvidenceActionItems,
  getEvidenceByDate,
  getEvidenceForPeriod,
  getEvidenceWarnings,
  getLatestEvidenceByKind,
  queryEvidenceCatalog
} from "../evidence-query";
import { summarizeEvidenceCatalog } from "../evidence-summary";

function entry(overrides: Partial<EbosEvidenceCatalogEntry>): EbosEvidenceCatalogEntry {
  return {
    id: "health_snapshot:2026-07-01:file.json",
    filePath: "reports/ebos/evidence/health_snapshot/file.json",
    fileName: "file.json",
    evidenceKind: "health_snapshot",
    contractVersion: "ebos-evidence-v1",
    targetDate: "2026-07-01",
    generatedAt: "2026-07-01T00:00:00.000Z",
    generator: "unit-test",
    score: 90,
    confidence: "complete",
    warningsCount: 0,
    errorsCount: 0,
    actionItemsCount: 0,
    validationStatus: "valid",
    ...overrides
  };
}

function catalog(entries: EbosEvidenceCatalogEntry[]): EbosEvidenceCatalog {
  return {
    catalogVersion: "ebos-evidence-catalog-v1",
    generatedAt: "2026-07-03T00:00:00.000Z",
    rootDir: "reports/ebos/evidence",
    totalEntries: entries.length,
    entries,
    summary: summarizeEvidenceCatalog(entries)
  };
}

describe("evidence query", () => {
  const sampleCatalog = catalog([
    entry({ id: "health:1", evidenceKind: "health_snapshot", targetDate: "2026-07-01", generatedAt: "2026-07-01T00:00:00.000Z", score: 80 }),
    entry({ id: "weekly:1", evidenceKind: "weekly_report", targetDate: "2026-07-02", generatedAt: "2026-07-02T00:00:00.000Z", score: 65, confidence: "partial" }),
    entry({ id: "weekly:2", evidenceKind: "weekly_report", targetDate: "2026-07-03", generatedAt: "2026-07-03T00:00:00.000Z", score: 75, confidence: "complete" })
  ]);

  test("queries by evidence kind", () => {
    expect(queryEvidenceCatalog(sampleCatalog, { kind: "weekly_report" }).map((item) => item.id)).toEqual([
      "weekly:2",
      "weekly:1"
    ]);
  });

  test("queries by target date range", () => {
    expect(queryEvidenceCatalog(sampleCatalog, {
      dateFrom: "2026-07-02",
      dateTo: "2026-07-03",
      sortBy: "targetDate",
      sortOrder: "asc"
    }).map((item) => item.id)).toEqual(["weekly:1", "weekly:2"]);
  });

  test("filters by minimum score and confidence", () => {
    expect(queryEvidenceCatalog(sampleCatalog, {
      minScore: 70,
      confidence: "complete"
    }).map((item) => item.id)).toEqual(["weekly:2", "health:1"]);
  });

  test("returns latest evidence by kind", () => {
    expect(getLatestEvidenceByKind(sampleCatalog, "weekly_report")?.id).toBe("weekly:2");
  });

  test("supports date and period helpers", () => {
    expect(getEvidenceByDate(sampleCatalog, "2026-07-01").map((item) => item.id)).toEqual(["health:1"]);
    expect(getEvidenceForPeriod(sampleCatalog, "2026-07-02", "2026-07-03")).toHaveLength(2);
  });

  test("returns action items and warnings from filtered evidence", () => {
    const withDetails = catalog([
      entry({
        id: "weekly:warning",
        evidenceKind: "weekly_report",
        warnings: [{ code: "missing_data", severity: "critical", message: "Missing GSC" }],
        actionItems: [{ id: "a1", title: "Add GSC", description: "", priority: "medium", owner: "codex", status: "open" }]
      })
    ]);

    expect(getEvidenceWarnings(withDetails, { kind: "weekly_report" })[0]).toMatchObject({
      entryId: "weekly:warning",
      severity: "critical"
    });
    expect(getEvidenceActionItems(withDetails, { kind: "weekly_report" })[0]).toMatchObject({
      entryId: "weekly:warning",
      title: "Add GSC"
    });
  });
});
