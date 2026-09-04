import { describe, expect, test } from "vitest";
import {
  extractSoftwareUrlsFromSitemapXml,
  normalizeProductPageUrl,
  resolveKeyProductPageUrls
} from "../product-page-url-source";

const SITE_URL = "https://www.enhe-tech.com.cn";

describe("product page URL source", () => {
  test("extracts software detail URLs from sitemap XML", () => {
    const urls = extractSoftwareUrlsFromSitemapXml(`
      <urlset>
        <url><loc>${SITE_URL}/software</loc></url>
        <url><loc>${SITE_URL}/software/tool-a</loc></url>
        <url><loc>${SITE_URL}/en/software/tool-a</loc></url>
        <url><loc>${SITE_URL}/okf/software/index.md</loc></url>
      </urlset>
    `, SITE_URL);

    expect(urls.map((candidate) => candidate.path)).toEqual([
      "/software/tool-a",
      "/en/software/tool-a"
    ]);
    expect(urls.every((candidate) => candidate.isProductDetailPage)).toBe(true);
    expect(urls.every((candidate) => candidate.source === "sitemap")).toBe(true);
  });

  test("does not treat the software listing page as a product detail page", () => {
    const urls = extractSoftwareUrlsFromSitemapXml(`
      <urlset>
        <url><loc>${SITE_URL}/software</loc></url>
        <url><loc>${SITE_URL}/en/software</loc></url>
      </urlset>
    `, SITE_URL);

    expect(urls).toEqual([]);
  });

  test("normalizes absolute and relative URLs against the checked site", () => {
    expect(normalizeProductPageUrl(SITE_URL, "/software/tool-a")).toEqual({
      url: `${SITE_URL}/software/tool-a`,
      path: "/software/tool-a"
    });
    expect(normalizeProductPageUrl(SITE_URL, "https://staging.example.com/software/tool-b?x=1")).toEqual({
      url: `${SITE_URL}/software/tool-b?x=1`,
      path: "/software/tool-b?x=1"
    });
  });

  test("prefers sitemap URLs when sitemap contains product detail pages", () => {
    const result = resolveKeyProductPageUrls({
      siteUrl: SITE_URL,
      sitemapXml: `<urlset><url><loc>${SITE_URL}/software/from-sitemap</loc></url></urlset>`,
      internalProducts: [{ slug: "from-db", label: "From DB" }],
      manualFallbackPaths: ["/software"]
    });

    expect(result.source).toBe("sitemap");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      path: "/software/from-sitemap",
      source: "sitemap",
      confidence: "complete",
      environmentMismatchRisk: false
    });
  });

  test("falls back to database products when sitemap has no product detail URLs", () => {
    const result = resolveKeyProductPageUrls({
      siteUrl: SITE_URL,
      sitemapXml: `<urlset><url><loc>${SITE_URL}/software</loc></url></urlset>`,
      internalProducts: [{ slug: "from-db", label: "From DB" }]
    });

    expect(result.source).toBe("internal_database");
    expect(result.candidates[0]).toMatchObject({
      url: `${SITE_URL}/software/from-db`,
      source: "internal_database",
      label: "From DB",
      slug: "from-db"
    });
  });

  test("falls back to manual URLs when database is unavailable", () => {
    const result = resolveKeyProductPageUrls({
      siteUrl: SITE_URL,
      sitemapXml: `<urlset></urlset>`,
      databaseAvailable: false,
      manualFallbackPaths: ["/software"]
    });

    expect(result.source).toBe("manual_fallback");
    expect(result.candidates[0]).toMatchObject({
      url: `${SITE_URL}/software`,
      source: "manual_fallback",
      label: "software listing page",
      isProductDetailPage: false
    });
  });

  test("marks environment mismatch risk for production site URL with local database", () => {
    const result = resolveKeyProductPageUrls({
      siteUrl: SITE_URL,
      sitemapXml: `<urlset></urlset>`,
      databaseUrl: "postgresql://user:pass@localhost:5432/enhe",
      internalProducts: [{ slug: "local-db-product" }]
    });

    expect(result.candidates[0]?.environmentMismatchRisk).toBe(true);
    expect(result.candidates[0]?.reason).toContain("URL source may not match checked environment");
  });

  test("deduplicates URLs and returns at most five candidates", () => {
    const result = resolveKeyProductPageUrls({
      siteUrl: SITE_URL,
      sitemapXml: `<urlset>
        <url><loc>${SITE_URL}/software/a</loc></url>
        <url><loc>${SITE_URL}/software/a</loc></url>
        <url><loc>${SITE_URL}/software/b</loc></url>
        <url><loc>${SITE_URL}/software/c</loc></url>
        <url><loc>${SITE_URL}/software/d</loc></url>
        <url><loc>${SITE_URL}/software/e</loc></url>
        <url><loc>${SITE_URL}/software/f</loc></url>
      </urlset>`
    });

    expect(result.candidates.map((candidate) => candidate.path)).toEqual([
      "/software/a",
      "/software/b",
      "/software/c",
      "/software/d",
      "/software/e"
    ]);
  });

  test("returns an empty result with a warning when no URL source is available", () => {
    const result = resolveKeyProductPageUrls({
      siteUrl: SITE_URL,
      sitemapXml: `<urlset></urlset>`,
      databaseAvailable: false,
      manualFallbackPaths: []
    });

    expect(result.source).toBe("none");
    expect(result.candidates).toEqual([]);
    expect(result.warnings[0]?.message).toContain("No key product page URL candidates");
  });
});
