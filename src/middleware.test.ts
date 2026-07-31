import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("locale switch redirects", () => {
  it("permanently redirects legacy locale query URLs to their canonical path", () => {
    const response = middleware(
      new NextRequest(
        "https://www.enhe-tech.com.cn/en/ai-news/copilot-cli-byok?locale=en",
      ),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.enhe-tech.com.cn/en/ai-news/copilot-cli-byok",
    );
  });

  it("labels machine-readable resources by their actual language", () => {
    const pricing = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/pricing.md"),
    );
    const okf = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/okf/index.md"),
    );
    const llms = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/llms.txt"),
    );

    expect(pricing.headers.get("content-language")).toBe("en-US");
    expect(okf.headers.get("content-language")).toBe("en-US");
    expect(llms.headers.get("content-language")).toBe("zh-CN, en-US");
  });

  it("does not assign a human language to neutral crawl-control resources", () => {
    const robots = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/robots.txt"),
    );
    const sitemap = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/sitemap.xml"),
    );

    expect(robots.headers.has("content-language")).toBe(false);
    expect(sitemap.headers.has("content-language")).toBe(false);
  });
});
