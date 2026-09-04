import { describe, expect, test, vi } from "vitest";
import { validateEvidenceEnvelope, wrapProductEvidence } from "../../evidence";
import { buildProductEvidence } from "../product-evidence-builder";
import type { EbosProductFetcher } from "../product-evidence-types";

function response(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body
  };
}

describe("product evidence builder", () => {
  test("does not crash when site and database evidence are thin", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network unavailable");
    }) satisfies EbosProductFetcher;
    const prismaClient = {
      tool: {
        findMany: vi.fn(async () => {
          throw new Error("database unavailable");
        })
      }
    };

    const evidence = await buildProductEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      siteUrl: "https://example.com",
      fetcher,
      prismaClient
    });

    expect(evidence.evidenceType).toBe("product_evidence");
    expect(evidence.productsAudited).toBeGreaterThan(0);
    expect(evidence.confidence).toBe("partial");
    expect(evidence.warnings.length).toBeGreaterThan(0);
    expect(evidence.actionItems.length).toBeGreaterThan(0);
  });

  test("wraps product evidence in a valid ebos-evidence-v1 envelope", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/sitemap.xml")) {
        return response("<urlset><url><loc>https://example.com/software/complete-product</loc></url></urlset>");
      }
      return response(`
        <h1>Complete Product</h1>
        <section>Product summary for local AI creators.</section>
        <h2>Features</h2><ul><li>Fast</li></ul>
        <h2>Use cases</h2><p>Use it for creator workflows.</p>
        <h2>Who it is for</h2><p>For creators.</p>
        <h2>Pricing</h2><p>Buy now for 19 CNY.</p>
        <a href="/checkout/complete-product">Buy now</a>
        <a href="/downloads/complete-product">Download after purchase</a>
        <h2>FAQ</h2><h3>Question?</h3><p>Answer.</p>
        <img src="/cover.png" alt="Cover" />
        <h2>Support</h2><p>Support and refund policy included.</p>
      `);
    }) satisfies EbosProductFetcher;
    const prismaClient = {
      tool: {
        findMany: vi.fn(async () => [])
      }
    };
    const evidence = await buildProductEvidence({
      targetDate: "2026-07-03",
      generatedAt: "2026-07-03T00:00:00.000Z",
      siteUrl: "https://example.com",
      fetcher,
      prismaClient
    });

    const envelope = wrapProductEvidence(evidence, {
      targetDate: evidence.targetDate,
      generatedAt: evidence.generatedAt,
      siteUrl: evidence.siteUrl,
      generator: "unit-test"
    });

    expect(envelope.meta.contractVersion).toBe("ebos-evidence-v1");
    expect(envelope.meta.evidenceKind).toBe("product_evidence");
    expect(envelope.quality.score).toBe(evidence.overallScore);
    expect(validateEvidenceEnvelope(envelope)).toEqual({ valid: true, issues: [] });
  });
});
