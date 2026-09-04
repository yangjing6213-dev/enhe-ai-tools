import { describe, expect, test, vi } from "vitest";
import {
  buildProductAuditUrlList,
  runProductSiteAudit
} from "../product-site-auditor";
import type { EbosProductFetcher } from "../product-evidence-types";

function response(body: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body
  };
}

describe("product site auditor", () => {
  test("builds a product detail URL list from sitemap.xml", async () => {
    const fetcher = vi.fn(async () => response(`
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/software</loc></url>
        <url><loc>https://example.com/software/b-product</loc></url>
        <url><loc>https://example.com/software/a-product</loc></url>
        <url><loc>https://example.com/en/software/en-product</loc></url>
      </urlset>
    `)) satisfies EbosProductFetcher;

    const result = await buildProductAuditUrlList({ siteUrl: "https://example.com", fetcher });

    expect(result.sitemapStatus).toBe("available");
    expect(result.urls).toEqual([
      "https://example.com/software/a-product",
      "https://example.com/software/b-product",
      "https://example.com/en/software/en-product"
    ]);
    expect(result.urls).not.toContain("https://example.com/software");
  });

  test("falls back to product URL source when sitemap is unavailable", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("network down");
    }) satisfies EbosProductFetcher;

    const result = await buildProductAuditUrlList({
      siteUrl: "https://example.com",
      fetcher,
      internalProducts: [{ slug: "db-product", name: "DB Product" }]
    });

    expect(result.sitemapStatus).toBe("fallback");
    expect(result.urlSource).toBe("internal_database");
    expect(result.urls).toEqual(["https://example.com/software/db-product"]);
    expect(result.warnings[0]?.message).toContain("sitemap.xml unavailable");
  });

  test("does not treat the /software listing page as a product detail page", async () => {
    const fetcher = vi.fn(async () => response(`
      <urlset>
        <url><loc>https://example.com/software</loc></url>
      </urlset>
    `)) satisfies EbosProductFetcher;

    const result = await buildProductAuditUrlList({
      siteUrl: "https://example.com",
      fetcher,
      manualFallbackPaths: ["/software"]
    });

    expect(result.urls).toEqual(["https://example.com/software"]);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "product_detail_urls_unconfirmed"
    }));
  });

  test("records page fetch failures as warnings instead of crashing", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith("/sitemap.xml")) {
        return response("<urlset><url><loc>https://example.com/software/failing-product</loc></url></urlset>");
      }
      throw new Error("page unavailable");
    }) satisfies EbosProductFetcher;

    const result = await runProductSiteAudit({ siteUrl: "https://example.com", fetcher });

    expect(result.pageAudits).toHaveLength(1);
    expect(result.pageAudits[0]?.warnings).toContainEqual(expect.objectContaining({
      code: "page_fetch_warning"
    }));
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "page_fetch_warning"
    }));
  });
});
