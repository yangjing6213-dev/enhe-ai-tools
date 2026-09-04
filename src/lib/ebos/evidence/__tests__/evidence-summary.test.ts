import { describe, expect, test } from "vitest";
import type { EbosEvidenceCatalogEntry } from "../evidence-catalog-types";
import {
  calculateAverageEvidenceScore,
  countCriticalWarnings,
  countOpenActionItems,
  findMissingEvidenceKinds,
  getLatestEntriesByKind,
  summarizeEvidenceCatalog
} from "../evidence-summary";

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
    confidence: "complete",
    warningsCount: 0,
    errorsCount: 0,
    actionItemsCount: 0,
    validationStatus: "valid",
    ...overrides
  };
}

describe("evidence summary", () => {
  test("summarizes entries by kind, confidence, and validation status", () => {
    const summary = summarizeEvidenceCatalog([
      entry({ evidenceKind: "health_snapshot", confidence: "complete", validationStatus: "valid" }),
      entry({ evidenceKind: "weekly_report", confidence: "partial", validationStatus: "valid_with_warnings" })
    ]);

    expect(summary.byKind).toEqual({
      health_snapshot: 1,
      weekly_report: 1
    });
    expect(summary.byConfidence).toEqual({
      complete: 1,
      partial: 1
    });
    expect(summary.byValidationStatus).toEqual({
      valid: 1,
      valid_with_warnings: 1
    });
  });

  test("calculates average score from entries that have numeric scores", () => {
    expect(calculateAverageEvidenceScore([
      entry({ score: 90 }),
      entry({ score: 70 }),
      entry({ score: undefined })
    ])).toBe(80);
  });

  test("reports missing expected evidence kinds without failing", () => {
    expect(findMissingEvidenceKinds([
      entry({ evidenceKind: "health_snapshot" }),
      entry({ evidenceKind: "data_source_readiness" })
    ])).toContain("monthly_review");
  });

  test("returns latest entries by kind using generatedAt then targetDate ordering", () => {
    const latest = getLatestEntriesByKind([
      entry({ evidenceKind: "weekly_report", targetDate: "2026-06-29", generatedAt: "2026-07-01T00:00:00.000Z" }),
      entry({ evidenceKind: "weekly_report", targetDate: "2026-07-06", generatedAt: "2026-07-08T00:00:00.000Z" })
    ]);

    expect(latest.weekly_report?.targetDate).toBe("2026-07-06");
  });

  test("counts critical warnings and open action items", () => {
    const entries = [
      entry({
        warnings: [{ code: "critical", severity: "critical", message: "Critical warning" }],
        actionItems: [{ id: "a1", title: "Open", description: "", priority: "high", owner: "codex", status: "open" }]
      }),
      entry({
        warnings: [{ code: "info", severity: "info", message: "Info warning" }],
        actionItems: [{ id: "a2", title: "Done", description: "", priority: "low", owner: "codex", status: "done" }]
      })
    ];

    expect(countCriticalWarnings(entries)).toBe(1);
    expect(countOpenActionItems(entries)).toBe(1);
  });
});
