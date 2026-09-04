import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBaiduPushEndpoint,
  buildBaiduPushUrls,
  extractBaiduUrlsFromSitemapXml,
  notifyBaiduSearch,
  submitBaiduUrls
} from "@/lib/baidu-push";

const originalToken = process.env.BAIDU_PUSH_TOKEN;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalBaiduSiteUrl = process.env.BAIDU_PUSH_SITE_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalToken === undefined) {
    delete process.env.BAIDU_PUSH_TOKEN;
  } else {
    process.env.BAIDU_PUSH_TOKEN = originalToken;
  }
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  }
  if (originalBaiduSiteUrl === undefined) {
    delete process.env.BAIDU_PUSH_SITE_URL;
  } else {
    process.env.BAIDU_PUSH_SITE_URL = originalBaiduSiteUrl;
  }
});

describe("Baidu ordinary URL push", () => {
  it("builds the official ordinary collection endpoint from server env", () => {
    process.env.BAIDU_PUSH_TOKEN = "server-only-token";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn/";

    expect(buildBaiduPushEndpoint()).toBe(
      "http://data.zz.baidu.com/urls?site=https://www.enhe-tech.com.cn&token=server-only-token"
    );
  });

  it("lets Baidu's site parameter override the public app URL when configured", () => {
    process.env.BAIDU_PUSH_TOKEN = "server-only-token";
    process.env.NEXT_PUBLIC_APP_URL = "https://localhost:3000";
    process.env.BAIDU_PUSH_SITE_URL = "https://www.enhe-tech.com.cn/";

    expect(buildBaiduPushEndpoint()).toBe(
      "http://data.zz.baidu.com/urls?site=https://www.enhe-tech.com.cn&token=server-only-token"
    );
  });

  it("deduplicates public canonical URLs and filters private, draft-like, API, and external paths", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn";

    expect(
      buildBaiduPushUrls([
        "/ai-news/story",
        "/ai-news/story",
        "/software/tool",
        "/admin",
        "/api/health",
        "/login",
        "/register",
        "/user",
        "/user-center",
        "/checkout",
        "/orders/1",
        "/payment",
        "/online-tools/legacy",
        "https://example.com/ai-news/story",
        "notaurl"
      ])
    ).toEqual(["https://www.enhe-tech.com.cn/ai-news/story", "https://www.enhe-tech.com.cn/software/tool"]);
  });

  it("extracts sitemap loc URLs while keeping Baidu pushes focused on public Chinese canonical pages by default", () => {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://www.enhe-tech.com.cn/ai-news</loc></url>
  <url><loc>https://www.enhe-tech.com.cn/en/ai-news</loc></url>
  <url><loc>https://www.enhe-tech.com.cn/software/tool</loc></url>
  <url><loc>https://www.enhe-tech.com.cn/admin</loc></url>
  <url><loc>https://www.enhe-tech.com.cn/online-tools/legacy</loc></url>
</urlset>`;

    expect(extractBaiduUrlsFromSitemapXml(sitemapXml)).toEqual([
      "https://www.enhe-tech.com.cn/ai-news",
      "https://www.enhe-tech.com.cn/software/tool"
    ]);
    expect(extractBaiduUrlsFromSitemapXml(sitemapXml, { includeEnglish: true })).toContain("https://www.enhe-tech.com.cn/en/ai-news");
  });

  it("posts newline separated URLs as text/plain and returns Baidu response fields", async () => {
    process.env.BAIDU_PUSH_TOKEN = "server-only-token";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ remain: 99998, success: 2, not_same_site: [], not_valid: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitBaiduUrls(["/ai-news/story", "/software/tool"]);

    expect(result).toEqual({
      ok: true,
      submitted: 2,
      status: 200,
      response: { remain: 99998, success: 2, not_same_site: [], not_valid: [] },
      urls: ["https://www.enhe-tech.com.cn/ai-news/story", "https://www.enhe-tech.com.cn/software/tool"]
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://data.zz.baidu.com/urls?site=https://www.enhe-tech.com.cn&token=server-only-token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "https://www.enhe-tech.com.cn/ai-news/story\nhttps://www.enhe-tech.com.cn/software/tool"
      })
    );
  });

  it("does not throw during best-effort notifications when token is missing or request fails", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    delete process.env.BAIDU_PUSH_TOKEN;
    await expect(notifyBaiduSearch(["/ai-news/story"])).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith("[baidu-push] submission skipped or failed", expect.objectContaining({ reason: "missing-token" }));

    process.env.BAIDU_PUSH_TOKEN = "server-only-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(notifyBaiduSearch(["/ai-news/story"])).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith("[baidu-push] submission skipped or failed", expect.objectContaining({ reason: "request-failed" }));
  });
});
