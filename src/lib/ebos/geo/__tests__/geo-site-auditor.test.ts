import { describe, expect, test } from "vitest";
import { buildGeoAuditUrlList, runGeoSiteAudit } from "../geo-site-auditor";

describe("geo-site-auditor", () => {
  test("prioritizes product and content URLs from sitemap", async () => {
    const result = await buildGeoAuditUrlList({
      siteUrl: "https://www.enhe-tech.com.cn",
      fetcher: async () => ({
        ok: true,
        status: 200,
        text: async () => `
          <urlset>
            <url><loc>https://www.enhe-tech.com.cn/</loc></url>
            <url><loc>https://www.enhe-tech.com.cn/software/windows-ai</loc></url>
            <url><loc>https://www.enhe-tech.com.cn/ai-news/example</loc></url>
            <url><loc>https://www.enhe-tech.com.cn/skill-learning/example</loc></url>
          </urlset>`
      })
    });

    expect(result.urls[0]).toBe("https://www.enhe-tech.com.cn/software/windows-ai");
    expect(result.urls).toContain("https://www.enhe-tech.com.cn/ai-news/example");
  });

  test("does not crash when page fetches fail", async () => {
    const result = await runGeoSiteAudit({
      siteUrl: "https://www.enhe-tech.com.cn",
      maxUrls: 1,
      fetcher: async () => {
        throw new Error("offline");
      }
    });

    expect(result.pageAudits.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
