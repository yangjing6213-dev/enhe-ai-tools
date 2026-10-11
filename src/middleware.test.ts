import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("locale switch redirects", () => {
  it("automatically follows country language on a localized deep link for first-time visitors", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/software", {
        headers: { "cf-ipcountry": "US", "user-agent": "Mozilla/5.0" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://www.enhe-tech.com.cn/en/software");
    expect(response.headers.get("set-cookie")).toContain("enhe_locale=en");
  });

  it("preserves an explicit English URL until the visitor has saved a language choice", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/en/software", {
        headers: { "cf-ipcountry": "CN", "user-agent": "Mozilla/5.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps a manually selected Chinese language when the visitor is outside China", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/software", {
        headers: { cookie: "enhe_locale=zh", "cf-ipcountry": "US", "user-agent": "Mozilla/5.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps preview locale parameters and gives the preview page the selected language", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/redesign-preview/software?locale=zh", {
        headers: { cookie: "enhe_locale=en", "cf-ipcountry": "US", "user-agent": "Mozilla/5.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-enhe-html-locale")).toBe("zh");
    expect(response.cookies.get("enhe_locale")?.value).toBe("zh");
  });

  it("redirects unauthenticated admin paths before database-backed rendering", () => {
    const response = middleware(new NextRequest("https://www.enhe-tech.com.cn/admin"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnTo")).toBe("/admin");
  });

  it("keeps the English admin boundary on the English login path", () => {
    const response = middleware(new NextRequest("https://www.enhe-tech.com.cn/en/admin"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("returnTo")).toBe("/en/admin");
  });

  it("preserves the requested admin page and filters through sign-in", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/admin/orders?status=pending&page=2"),
    );

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnTo")).toBe("/admin/orders?status=pending&page=2");
  });

  it("preserves nested English admin paths through the English sign-in page", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/en/admin/users?status=active"),
    );

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/en/login");
    expect(location.searchParams.get("returnTo")).toBe("/en/admin/users?status=active");
  });

  it("does not replay an unauthenticated admin action as a POST to the login page", () => {
    const response = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/admin/orders", {
        method: "POST",
        body: "admin-action-payload",
      }),
    );

    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location")!).searchParams.get("returnTo")).toBe("/admin/orders");
  });

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
