import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/dictionaries";
import { buildHomeMetadataTitle } from "@/lib/seo";

const root = resolve(__dirname, "../..");

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("site audit regression coverage", () => {
  it("keeps homepage and listing metadata broad enough for current SEO targets", () => {
    expect(buildHomeMetadataTitle("zh", dictionaries.zh.brand)).toContain("AI前沿资讯");
    expect(buildHomeMetadataTitle("en", dictionaries.en.brand)).toContain("AI News");

    expect(dictionaries.zh.listing.softwareIntro.length).toBeGreaterThanOrEqual(50);
    expect(dictionaries.zh.listing.onlineIntro.length).toBeGreaterThanOrEqual(50);
    expect(dictionaries.zh.listing.skillLearningIntro.length).toBeGreaterThanOrEqual(50);
    expect(dictionaries.zh.pricing.intro.length).toBeGreaterThanOrEqual(50);
  });

  it("keeps the homepage featured fallback as useful internal links", () => {
    const homeShell = read("src/app/page-shell.tsx");

    expect(homeShell).toContain('{" "}');
    expect(dictionaries.zh.home.featuredContentEmpty).not.toContain("后台设置");
    expect(dictionaries.en.home.featuredContentEmpty).not.toContain("admin panel");
    expect(homeShell).toContain("home-fallback-link-grid");
    expect(homeShell).toContain('"/ai-news"');
    expect(homeShell).toContain('"/account-services"');
  });

  it("gives robots and sitemap public cache headers", () => {
    const nextConfig = read("next.config.ts");

    expect(nextConfig).toContain('source: "/robots.txt"');
    expect(nextConfig).toContain('source: "/sitemap.xml"');
    expect(nextConfig).toContain("stale-while-revalidate=86400");
  });

  it("treats zh AI news routes as Chinese public pages in middleware", () => {
    const middleware = read("middleware.ts");

    expect(middleware).toContain('"/ai-news"');
    expect(middleware).toContain('pathname.startsWith("/ai-news/")');
  });

  it("renders AI news publish dates with machine-readable time tags", () => {
    const newsDetail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(newsDetail).toContain("<time");
    expect(newsDetail).toContain("dateTime=");
  });
});
