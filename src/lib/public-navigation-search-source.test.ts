import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  try {
    return readFileSync(new URL(relativePath, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return "";
  }
}

describe("public navigation and search source contract", () => {
  it("uses the approved bilingual top-level navigation order and real routes", () => {
    const header = readSource("../components/site-header.tsx");
    const dictionaries = readSource("dictionaries.ts");
    const mobile = readSource("../components/mobile-nav-menu.tsx");

    const home = header.indexOf('label: t.nav.home');
    const tools = header.indexOf('label: t.nav.software');
    const news = header.indexOf('label: t.nav.aiNews');
    const trends = header.indexOf('label: t.nav.aiTrends');
    const tutorials = header.indexOf('label: t.nav.skillLearning');
    const about = header.indexOf('label: t.nav.about');
    const search = header.indexOf('label: t.nav.search');

    expect([home, tools, news, trends, tutorials, about, search].every((index) => index >= 0)).toBe(true);
    expect(home).toBeLessThan(tools);
    expect(tools).toBeLessThan(news);
    expect(news).toBeLessThan(trends);
    expect(trends).toBeLessThan(tutorials);
    expect(tutorials).toBeLessThan(about);
    expect(about).toBeLessThan(search);
    expect(header).toContain('href: buildLocalePath("/about", locale)');
    expect(header).toContain('href: buildLocalePath("/search", locale)');
    expect(header).toContain("softwareNavCategories.map");
    expect(header).toContain("PublicNavLink");
    expect(header).toContain("HeaderAdminNavLink");
    expect(mobile).toContain("PublicNavLink");
    expect(mobile).toContain("Search");
    expect(dictionaries).toContain('software: "AI工具"');
    expect(dictionaries).toContain('aiNews: "AI资讯"');
    expect(dictionaries).toContain('aiTrends: "AI趋势"');
    expect(dictionaries).toContain('skillLearning: "AI教程"');
    expect(dictionaries).toContain('about: "关于我们"');
    expect(dictionaries).toContain('search: "搜索"');
    expect(dictionaries).toContain('software: "AI Tools"');
    expect(dictionaries).toContain('skillLearning: "AI Tutorials"');
    expect(dictionaries).toContain('about: "About Us"');
    expect(dictionaries).toContain('search: "Search"');
  });

  it("keeps channel queries separated by formal type and publication fields", () => {
    const software = readSource("../app/software/page-shell.tsx");
    const news = readSource("../app/ai-news/page-shell.tsx");
    const trends = readSource("../app/ai-trends/page-shell.tsx");
    const tutorials = readSource("../app/skill-learning/page-shell.tsx");
    const publicContent = readSource("public-content.ts");
    const trendData = readSource("ai-trends.ts");

    expect(software).toContain("getProductionSoftwareCatalog");
    expect(news).toContain("getPublicNewsListing");
    expect(trends).toContain("getAiTrendBriefingSummaries");
    expect(tutorials).toMatch(/getPublicToolListing\(\s*"skill_learning"/);
    expect(publicContent).toContain('where: { status: "active", tool: { status: "published" } }');
    expect(publicContent).toContain('tutorials: { some: { status: "active" } }');
    expect(publicContent).toContain('type,\n          status: "published"');
    expect(publicContent).toContain('{ type: { in: ["software", "online", "ai_skill"] } }');
    expect(trendData).toContain('status: "published" as const');
    expect(trendData).toContain('publishedAt: { not: null }');
  });

  it("implements a localized public-only search with explicit result states", () => {
    const searchData = readSource("public-search.ts");
    const shell = readSource("../app/search/page-shell.tsx");
    const dialog = readSource("../components/public-search-dialog.tsx");
    const zhPage = readSource("../app/(zh-public)/search/page.tsx");
    const enPage = readSource("../app/en/search/page.tsx");

    expect(searchData).toContain('status: "published"');
    expect(searchData).toContain('status: "active"');
    expect(searchData).toContain('type: "skill_learning"');
    expect(searchData).toContain("getAiTrendBriefingSummaries");
    expect(searchData).toContain("resolveLocalizedToolIdentity");
    expect(searchData).toContain("getCanonicalAiNewsSlug");
    expect(searchData).not.toContain("prisma.user");
    expect(searchData).not.toContain("prisma.order");
    expect(searchData).not.toContain("prisma.admin");
    expect(shell).toContain("robots: { index: false, follow: true }");
    expect(shell).toContain("PublicSearchDialog");
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain('event.key === "Tab"');
    expect(dialog).toContain("router.push(homePath)");
    expect(dialog).toContain("isPending");
    expect(dialog).toContain("emptyText");
    expect(dialog).toContain("errorText");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('name="q"');
    expect(zhPage).toContain('forceLocale="zh"');
    expect(enPage).toContain('forceLocale="en"');
  });

  it("keeps search pages out of sitemap while exposing a valid SearchAction", () => {
    const chrome = readSource("../components/public-site-chrome.tsx");
    const seo = readSource("seo.ts");
    const sitemap = readSource("../app/sitemap.ts");

    expect(chrome).toContain('buildLocalePath("/search?q={search_term_string}", forceLocale)');
    expect(seo).toContain('/^\\/search$/');
    expect(sitemap).not.toContain('"/search",');
    expect(sitemap).not.toContain('"/en/search",');
  });

  it("repositions the existing skill-learning route as the bilingual tutorial center", () => {
    const dictionaries = readSource("dictionaries.ts");
    const seo = readSource("seo.ts");
    const page = readSource("../app/skill-learning/page-shell.tsx");

    expect(dictionaries).toContain('skillLearningTitle: "AI教程与实战指南"');
    expect(dictionaries).toContain('skillLearningTitle: "Practical AI Tutorials and Guides"');
    expect(seo).toContain('"skill-learning": "AI教程与实战指南、AI工具与本地部署教程"');
    expect(seo).toContain('"skill-learning": "Practical AI Tutorials and Guides"');
    expect(page).toContain('path: "/skill-learning"');
    expect(page).toContain('getPublicToolCategories("skill_learning")');
  });
});
