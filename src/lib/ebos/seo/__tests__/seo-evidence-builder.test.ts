import { describe, expect, test } from "vitest";
import { validateEvidenceEnvelope } from "../../evidence";
import { wrapSeoEvidence } from "../../evidence/evidence-normalizer";
import { buildSeoEvidence } from "../seo-evidence-builder";

describe("seo-evidence-builder", () => {
  test("builds SEO evidence without crashing when network data is empty", async () => {
    const evidence = await buildSeoEvidence({
      siteUrl: "https://www.enhe-tech.com.cn",
      targetDate: "2026-07-03",
      maxUrls: 1,
      fetcher: async () => {
        throw new Error("offline");
      }
    });

    expect(evidence.evidenceType).toBe("seo_evidence");
    expect(evidence.pagesAudited).toBeGreaterThan(0);
    expect(evidence.warnings.length).toBeGreaterThan(0);
    expect(evidence.confidence).toBe("partial");
  });

  test("wraps SEO evidence in a valid evidence envelope", async () => {
    const evidence = await buildSeoEvidence({
      siteUrl: "https://www.enhe-tech.com.cn",
      targetDate: "2026-07-03",
      urls: ["https://www.enhe-tech.com.cn/software/windows-ai"],
      fetcher: async () => ({
        ok: true,
        status: 200,
        text: async () => "<html><head><title>Windows AI</title><meta name='description' content='AI'></head><body><h1>Windows AI</h1><a href='/software'>Software</a></body></html>"
      })
    });

    const envelope = wrapSeoEvidence(evidence, {
      targetDate: evidence.targetDate,
      generatedAt: evidence.generatedAt,
      siteUrl: evidence.siteUrl,
      generator: "unit-test"
    });

    expect(validateEvidenceEnvelope(envelope).valid).toBe(true);
    expect(envelope.meta.evidenceKind).toBe("seo_evidence");
    expect(envelope.quality.score).toBe(evidence.overallScore);
  });
});
