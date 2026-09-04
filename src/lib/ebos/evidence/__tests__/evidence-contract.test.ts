import { describe, expect, test } from "vitest";
import {
  EBOS_EVIDENCE_KINDS,
  type EbosEvidenceEnvelope
} from "../evidence-contract";
import {
  EBOS_EVIDENCE_CONTRACT_VERSION,
  assertSupportedEvidenceContractVersion,
  isSupportedEvidenceContractVersion
} from "../evidence-contract-version";

describe("evidence contract", () => {
  test("uses the v1 evidence contract version", () => {
    expect(EBOS_EVIDENCE_CONTRACT_VERSION).toBe("ebos-evidence-v1");
    expect(isSupportedEvidenceContractVersion("ebos-evidence-v1")).toBe(true);
    expect(isSupportedEvidenceContractVersion("old-version")).toBe(false);
    expect(() => assertSupportedEvidenceContractVersion("old-version")).toThrow("Unsupported EBOS evidence contract version");
  });

  test("defines the complete evidence kind list", () => {
    expect(EBOS_EVIDENCE_KINDS).toEqual([
      "health_snapshot",
      "data_source_readiness",
      "weekly_report",
      "monthly_review",
      "seo_evidence",
      "geo_evidence",
      "market_evidence",
      "competitor_evidence",
      "revenue_evidence",
      "product_evidence"
    ]);
  });

  test("supports the base evidence envelope structure", () => {
    const envelope: EbosEvidenceEnvelope<{ ok: true }> = {
      meta: {
        contractVersion: EBOS_EVIDENCE_CONTRACT_VERSION,
        evidenceKind: "health_snapshot",
        generatedAt: "2026-07-03T00:00:00.000Z",
        targetDate: "2026-07-03",
        environment: "production",
        generator: "unit-test"
      },
      quality: {
        confidence: "complete",
        dataCompleteness: "complete",
        warningsCount: 0,
        errorsCount: 0
      },
      payload: { ok: true },
      warnings: [],
      actionItems: []
    };

    expect(envelope.meta.contractVersion).toBe("ebos-evidence-v1");
    expect(envelope.payload.ok).toBe(true);
  });
});
