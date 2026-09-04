import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path: string) {
  return existsSync(join(root, path));
}

describe("SEO and GEO priority fixes", () => {
  it("publishes the seven AI news topic routes in Chinese and English", () => {
    const topics = read("src/lib/ai-news-topics.ts");
    const sitemap = read("src/app/sitemap.ts");
    const seo = read("src/lib/seo.ts");
    const listing = read("src/app/ai-news/page-shell.tsx");

    for (const slug of [
      "ai-agent",
      "local-ai",
      "open-source-models",
      "ai-tools",
      "ai-tutorials",
      "ai-account-service",
      "ai-regulation",
    ]) {
      expect(topics).toContain(`slug: "${slug}"`);
      expect(sitemap).toContain(`/ai-news/topics/${slug}`);
      expect(seo).toContain("^\\/ai-news\\/topics\\/.+$");
      expect(listing).toContain(`/ai-news/topics/${slug}`);
    }

    expect(exists("src/app/(zh-public)/ai-news/topics/[slug]/page.tsx")).toBe(
      true,
    );
    expect(exists("src/app/en/ai-news/topics/[slug]/page.tsx")).toBe(true);
    expect(read("public/okf/ai-news/index.md")).toContain(
      "/ai-news/topics/ai-agent",
    );
  });

  it("uses a compact AI news title helper for SERP titles", () => {
    const detail = read("src/app/ai-news/[slug]/page-shell.tsx");
    const aiNews = read("src/lib/ai-news.ts");

    expect(aiNews).toContain("buildAiNewsSerpTitle");
    expect(detail).toContain("buildAiNewsSerpTitle");
    expect(detail).toContain("maxLength: forceLocale === \"en\" ? 58 : 60");
  });

  it("improves English account-service semantics and compliance copy", () => {
    const localization = read("src/lib/tool-localization.ts");

    expect(localization).toContain("buildAccountServiceEnglishName");
    expect(localization).toContain("compliance guidance");
    expect(localization).toContain("official platform policy");
    expect(localization).toContain("Review the service scope, delivery notes");
  });

  it("uses nofollow noopener noreferrer for external new-tab links", () => {
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const payments = read("src/app/orders/[id]/pay/page.tsx");
    const adminPayments = read("src/app/admin/payments/[id]/page.tsx");

    expect(toolDetail).toContain('rel="nofollow noopener noreferrer"');
    expect(payments).toContain('rel="nofollow noopener noreferrer"');
    expect(adminPayments).toContain('rel="nofollow noopener noreferrer"');
    expect(toolDetail).not.toContain('rel="noreferrer"');
    expect(payments).not.toContain('rel="noreferrer"');
    expect(adminPayments).not.toContain('rel="noreferrer"');
  });

  it("adds AI Trends answer blocks, source citations, and FAQ schema", () => {
    const trends = read("src/app/ai-trends/page-shell.tsx");

    expect(trends).toContain("aiTrendsAnswerBlock");
    expect(trends).toContain("aiTrendsSourceLinks");
    expect(trends).toContain("aiTrendsFaqItems");
    expect(trends).toContain("buildFaqSchema");
    expect(trends).toContain('"@type": "WebPage"');
    expect(trends).toContain("citation:");
  });
});
