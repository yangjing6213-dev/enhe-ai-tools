import { describe, expect, test } from "vitest";
import { buildSeoAuditUrlList, runSeoSiteAudit } from "../seo-site-auditor";

describe("seo-site-auditor", () => {
  test("falls back to core URLs when sitemap is unavailable", async () => {
    const result = await buildSeoAuditUrlList({
      siteUrl: "https://www.enhe-tech.com.cn",
      fetcher: async () => {
        throw new Error("network down");
      }
    });

    expect(result.urls).toContain("https://www.enhe-tech.com.cn/");
    expect(result.urls).toContain("https://www.enhe-tech.com.cn/software");
    expect(result.warnings[0]?.message).toContain("sitemap");
  });

  test("does not crash when page fetches fail", async () => {
    const result = await runSeoSiteAudit({
      siteUrl: "https://www.enhe-tech.com.cn",
      maxUrls: 2,
      fetcher: async () => {
        throw new Error("offline");
      }
    });

    expect(result.pageAudits.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
