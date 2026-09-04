import { describe, expect, test } from "vitest";
import type { EbosEvidenceEnvelope } from "../evidence-contract";
import { validateEvidenceEnvelope } from "../evidence-validator";

function validEnvelope(): EbosEvidenceEnvelope<{ ok: true }> {
  return {
    meta: {
      contractVersion: "ebos-evidence-v1",
      evidenceKind: "health_snapshot",
      generatedAt: "2026-07-03T00:00:00.000Z",
      targetDate: "2026-07-03",
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
    payload: { ok: true },
    warnings: [],
    actionItems: []
  };
}

describe("evidence validator", () => {
  test("passes a valid envelope", () => {
    const result = validateEvidenceEnvelope(validEnvelope());

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("returns an issue when meta is missing", () => {
    const result = validateEvidenceEnvelope({ ...validEnvelope(), meta: undefined });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "meta")).toBe(true);
  });

  test("returns an issue for invalid score", () => {
    const envelope = validEnvelope();
    envelope.quality.score = 101;

    const result = validateEvidenceEnvelope(envelope);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "quality.score")).toBe(true);
  });

  test("returns an issue for invalid evidenceKind", () => {
    const envelope = validEnvelope() as unknown as { meta: { evidenceKind: string } };
    envelope.meta.evidenceKind = "bad_kind";

    const result = validateEvidenceEnvelope(envelope);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "meta.evidenceKind")).toBe(true);
  });

  test("returns an issue for invalid generatedAt", () => {
    const envelope = validEnvelope();
    envelope.meta.generatedAt = "not-a-date";

    const result = validateEvidenceEnvelope(envelope);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "meta.generatedAt")).toBe(true);
  });

  test("returns an issue for unsupported contractVersion", () => {
    const envelope = validEnvelope() as unknown as { meta: { contractVersion: string } };
    envelope.meta.contractVersion = "ebos-evidence-v0";

    const result = validateEvidenceEnvelope(envelope);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "meta.contractVersion")).toBe(true);
  });

  test("does not throw for invalid input", () => {
    expect(() => validateEvidenceEnvelope(null)).not.toThrow();

    const result = validateEvidenceEnvelope(null);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
