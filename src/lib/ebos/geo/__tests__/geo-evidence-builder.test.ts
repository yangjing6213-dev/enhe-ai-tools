import { describe, expect, test } from "vitest";
import { validateEvidenceEnvelope } from "../../evidence";
import { wrapGeoEvidence } from "../../evidence/evidence-normalizer";
import { buildGeoEvidence } from "../geo-evidence-builder";

describe("geo-evidence-builder", () => {
  test("builds GEO evidence without crashing when network data is empty", async () => {
    const evidence = await buildGeoEvidence({
      siteUrl: "https://www.enhe-tech.com.cn",
      targetDate: "2026-07-03",
      maxUrls: 1,
      fetcher: async () => {
        throw new Error("offline");
      }
    });

    expect(evidence.evidenceType).toBe("geo_evidence");
    expect(evidence.pagesAudited).toBeGreaterThan(0);
    expect(evidence.warnings.length).toBeGreaterThan(0);
    expect(evidence.warnings.some((warning) => warning.message.includes("readiness"))).toBe(true);
  });

  test("wraps GEO evidence in a valid evidence envelope", async () => {
    const evidence = await buildGeoEvidence({
      siteUrl: "https://www.enhe-tech.com.cn",
      targetDate: "2026-07-03",
      urls: ["https://www.enhe-tech.com.cn/software/windows-ai"],
      fetcher: async () => ({
        ok: true,
        status: 200,
        text: async () => "<html><head><title>ENHE AI Tool</title><script type='application/ld+json'>{\"@type\":\"FAQPage\"}</script></head><body><h1>ENHE AI Tool</h1><h2>Summary</h2><h2>FAQ</h2><h2>How to use</h2><p>Updated on 2026-07-03 by ENHE.</p><a href='https://example.com/source'>Source</a></body></html>"
      })
    });

    const envelope = wrapGeoEvidence(evidence, {
      targetDate: evidence.targetDate,
      generatedAt: evidence.generatedAt,
      siteUrl: evidence.siteUrl,
      generator: "unit-test"
    });

    expect(validateEvidenceEnvelope(envelope).valid).toBe(true);
    expect(envelope.meta.evidenceKind).toBe("geo_evidence");
    expect(envelope.quality.score).toBe(evidence.overallScore);
  });
});
