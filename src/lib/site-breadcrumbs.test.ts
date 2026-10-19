import { getPageBreadcrumbs, getStructuredBreadcrumbs, normalizeBreadcrumbTitle } from "@/lib/site-breadcrumbs";
import { describe, expect, it } from "vitest";

describe("site breadcrumbs", () => {
  it("shows the localized home breadcrumb on the homepage", () => {
    expect(getPageBreadcrumbs("/", "zh")).toEqual([
      { href: "/", label: "首页", current: true },
    ]);
    expect(getPageBreadcrumbs("/en", "en")).toEqual([
      { href: "/en", label: "Home", current: true },
    ]);
  });

  it("builds a readable localized hierarchy for nested pages", () => {
    expect(getPageBreadcrumbs("/ai-news/topics/local-ai", "zh")).toEqual([
      { href: "/", label: "首页", current: false },
      { href: "/ai-news", label: "AI资讯", current: false },
      { href: "/ai-news/topics", label: "话题", current: false },
      { href: "/ai-news/topics/local-ai", label: "Local AI", current: true },
    ]);
    expect(getPageBreadcrumbs("/en/ai-news/topics/local-ai", "en")).toEqual([
      { href: "/en", label: "Home", current: false },
      { href: "/en/ai-news", label: "AI News", current: false },
      { href: "/en/ai-news/topics", label: "Topics", current: false },
      { href: "/en/ai-news/topics/local-ai", label: "Local AI", current: true },
    ]);
  });

  it("uses the page title and removes the site name", () => {
    expect(getPageBreadcrumbs(
      "/ai-skills/geo-seo-suite",
      "en",
      "GEO-SEO Suite — AI Search Optimization | ENHE AI",
    ).at(-1)).toEqual({
      href: "/en/ai-skills/geo-seo-suite",
      label: "GEO-SEO Suite — AI Search Optimization",
      current: true,
    });
  });

  it("keeps a short section label on top-level pages even when SEO titles are longer", () => {
    expect(getPageBreadcrumbs("/ai-news", "en", "AI News, Trend Insights, and Tool Decisions | ENHE AI")).toEqual([
      { href: "/en", label: "Home", current: false },
      { href: "/en/ai-news", label: "AI News", current: true },
    ]);
    expect(getPageBreadcrumbs("/ai-trends/daily", "zh", "AI Trends Daily Digest | ENHE AI").at(-1)).toEqual({
      href: "/ai-trends/daily",
      label: "每日趋势",
      current: true,
    });
  });

  it("uses a valid same-site breadcrumb schema when the page provides one", () => {
    const schema = JSON.stringify({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.enhe-tech.com.cn/en" },
        { "@type": "ListItem", position: 2, name: "Skills", item: "https://www.enhe-tech.com.cn/en/ai-skills" },
        { "@type": "ListItem", position: 3, name: "Marketing & SEO", item: "https://www.enhe-tech.com.cn/en/ai-skills/marketing-seo" },
        { "@type": "ListItem", position: 4, name: "GEO-SEO Suite — AI Search Optimization", item: "https://www.enhe-tech.com.cn/en/ai-skills/geo-seo-suite" },
      ],
    });

    expect(getStructuredBreadcrumbs([schema], "/en/ai-skills/geo-seo-suite", "https://www.enhe-tech.com.cn")).toEqual([
      { href: "/en", label: "Home", current: false },
      { href: "/en/ai-skills", label: "Skills", current: false },
      { href: "/en/ai-skills/marketing-seo", label: "Marketing & SEO", current: false },
      { href: "/en/ai-skills/geo-seo-suite", label: "GEO-SEO Suite — AI Search Optimization", current: true },
    ]);
  });

  it("ignores external breadcrumb links and generic site titles", () => {
    const externalSchema = JSON.stringify({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home", item: "https://example.com/" },
        { position: 2, name: "Article", item: "https://example.com/ai-news/story" },
      ],
    });
    expect(getStructuredBreadcrumbs([externalSchema], "/ai-news/story", "https://www.enhe-tech.com.cn")).toBeNull();
    expect(normalizeBreadcrumbTitle("ENHE AI")).toBe("");
  });

  it("includes admin pages in the same hierarchy", () => {
    expect(getPageBreadcrumbs("/admin/ai-workflows/cmw123", "zh")).toEqual([
      { href: "/", label: "首页", current: false },
      { href: "/admin", label: "后台管理", current: false },
      { href: "/admin/ai-workflows", label: "AI 工作流", current: false },
      { href: "/admin/ai-workflows/cmw123", label: "Cmw123", current: true },
    ]);
    expect(getPageBreadcrumbs("/admin/ai-workflows/cmw123", "en").map(({ href }) => href)).toEqual([
      "/en",
      "/admin",
      "/admin/ai-workflows",
      "/admin/ai-workflows/cmw123",
    ]);
  });
});
