import { describe, expect, test, vi } from "vitest";
import { checkUrlHealth, runEbosSmokeChecks } from "../smoke-checks";

describe("smoke checks", () => {
  test("marks 2xx responses as passed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200 });

    const result = await checkUrlHealth("https://example.com/sitemap.xml", {
      key: "sitemap",
      label: "Sitemap",
      fetchImpl
    });

    expect(result.status).toBe("passed");
    expect(result.httpStatus).toBe(200);
    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/sitemap.xml", expect.objectContaining({ method: "HEAD" }));
  });

  test("marks 404 responses as failed", async () => {
    const result = await checkUrlHealth("https://example.com/missing", {
      key: "homepage",
      label: "Homepage",
      fetchImpl: vi.fn().mockResolvedValue({ status: 404 })
    });

    expect(result.status).toBe("failed");
    expect(result.httpStatus).toBe(404);
    expect(result.recommendation).toContain("accessibility");
  });

  test("marks timeout as failed", async () => {
    const result = await checkUrlHealth("https://example.com", {
      key: "homepage",
      label: "Homepage",
      timeoutMs: 1,
      fetchImpl: vi.fn((_url, init?: RequestInit) => {
        init?.signal?.dispatchEvent(new Event("abort"));
        return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
      })
    });

    expect(result.status).toBe("failed");
    expect(result.summary).toContain("timed out");
  });

  test("marks missing url as skipped", async () => {
    const result = await checkUrlHealth("", {
      key: "homepage",
      label: "Homepage",
      fetchImpl: vi.fn()
    });

    expect(result.status).toBe("skipped");
    expect(result.recommendation).toContain("Configure");
  });

  test("runs default sitemap, robots, homepage, and product page checks", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200 });

    const results = await runEbosSmokeChecks({
      siteUrl: "https://example.com",
      productSlugs: ["tool-a", "tool-b"],
      fetchImpl
    });

    expect(results.map((result) => result.key)).toEqual([
      "sitemap",
      "robots",
      "homepage",
      "key_product_pages",
      "key_product_pages"
    ]);
    expect(results[0]?.url).toBe("https://example.com/sitemap.xml");
    expect(results[3]?.url).toBe("https://example.com/software/tool-a");
  });

  test("uses sitemap product detail URLs before database slugs", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://example.com/sitemap.xml" && init?.method === "GET") {
        return {
          status: 200,
          text: async () => "<urlset><url><loc>https://example.com/software/from-sitemap</loc></url></urlset>"
        };
      }
      return { status: 200 };
    });

    const results = await runEbosSmokeChecks({
      siteUrl: "https://example.com",
      productSlugs: ["from-db"],
      fetchImpl
    });
    const product = results.find((result) => result.key === "key_product_pages");

    expect(product?.url).toBe("https://example.com/software/from-sitemap");
    expect(product?.source).toBe("sitemap");
    expect(product?.sourceConfidence).toBe("complete");
    expect(product?.reason).toContain("sitemap.xml");
  });

  test("keeps sitemap sourced product 404 as a real online risk", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://example.com/sitemap.xml" && init?.method === "GET") {
        return {
          status: 200,
          text: async () => "<urlset><url><loc>https://example.com/software/missing</loc></url></urlset>"
        };
      }
      if (url === "https://example.com/software/missing") return { status: 404 };
      return { status: 200 };
    });

    const results = await runEbosSmokeChecks({
      siteUrl: "https://example.com",
      fetchImpl
    });
    const product = results.find((result) => result.key === "key_product_pages");

    expect(product?.status).toBe("failed");
    expect(product?.source).toBe("sitemap");
    expect(product?.environmentMismatchRisk).toBe(false);
    expect(product?.recommendation).toContain("accessibility");
  });

  test("marks database sourced product 404 as an environment mismatch risk", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://www.enhe-tech.com.cn/sitemap.xml" && init?.method === "GET") {
        return {
          status: 200,
          text: async () => "<urlset><url><loc>https://www.enhe-tech.com.cn/software</loc></url></urlset>"
        };
      }
      if (url === "https://www.enhe-tech.com.cn/software/local-only") return { status: 404 };
      return { status: 200 };
    });

    const results = await runEbosSmokeChecks({
      siteUrl: "https://www.enhe-tech.com.cn",
      env: { DATABASE_URL: "postgresql://user:pass@localhost:5432/enhe" },
      productSlugs: ["local-only"],
      fetchImpl
    });
    const product = results.find((result) => result.key === "key_product_pages");

    expect(product?.status).toBe("failed");
    expect(product?.source).toBe("internal_database");
    expect(product?.environmentMismatchRisk).toBe(true);
    expect(product?.recommendation).toBe("URL source may not match checked environment.");
  });

  test("does not treat the software listing fallback as a product detail page", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://example.com/sitemap.xml" && init?.method === "GET") {
        return { status: 200, text: async () => "<urlset></urlset>" };
      }
      return { status: 200 };
    });

    const results = await runEbosSmokeChecks({
      siteUrl: "https://example.com",
      manualFallbackPaths: ["/software"],
      fetchImpl
    });
    const product = results.find((result) => result.key === "key_product_pages");

    expect(product?.url).toBe("https://example.com/software");
    expect(product?.source).toBe("manual_fallback");
    expect(product?.isProductDetailPage).toBe(false);
    expect(product?.label).toContain("software listing page");
  });
});
