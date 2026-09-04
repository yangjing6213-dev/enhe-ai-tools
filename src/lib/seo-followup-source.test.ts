import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SEO follow-up source contracts", () => {
  it("keeps admin access session-driven in the header instead of hard-removing it", () => {
    const header = read("src/components/site-header.tsx");
    const mobileNav = read("src/components/mobile-nav-menu.tsx");
    const accountControls = read("src/components/header-account-controls.tsx");
    const adminNav = read("src/components/header-admin-nav-link.tsx");
    const sessionGate = read("src/components/header-session-gate.tsx");

    expect(header).toContain("t.nav.admin");
    expect(mobileNav).toContain("showAdmin");
    expect(header).toContain("HeaderSessionGate");
    expect(sessionGate).toContain('showAdmin={user?.role === "admin"}');
    expect(adminNav).toContain("site-nav-link");
    expect(accountControls).toContain("site-user-chip");
  });

  it("adds AI news detail pages to the public cache header rules", () => {
    const nextConfig = read("next.config.ts");

    expect(nextConfig).toContain('source: "/ai-news/:slug*"');
    expect(nextConfig).toContain('source: "/en/ai-news/:slug*"');
  });

  it("introduces canonical slug helpers for tools and AI news", () => {
    const adminForm = read("src/lib/admin-form.ts");
    const aiNews = read("src/lib/ai-news.ts");
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const newsDetail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(adminForm).toContain("buildSeoFriendlySlug");
    expect(aiNews).toContain("resolveAiNewsCanonicalSlug");
    expect(toolDetail).toContain("buildSeoFriendlySlug");
    expect(toolDetail).toContain("permanentRedirect(");
    expect(newsDetail).toContain("getCanonicalAiNewsSlug");
    expect(newsDetail).toContain("redirect(");
  });

  it("keeps public listing and tool detail content inside semantic main landmarks", () => {
    const software = read("src/app/software/page-shell.tsx");
    const accountServices = read("src/app/account-services/page-shell.tsx");
    const skillLearning = read("src/app/skill-learning/page-shell.tsx");
    const aiNews = read("src/app/ai-news/page-shell.tsx");
    const aiTrends = read("src/app/ai-trends/page-shell.tsx");
    const pricing = read("src/app/pricing/page-shell.tsx");
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const legalDetail = read("src/app/legal/[slug]/page-shell.tsx");

    for (const source of [
      software,
      accountServices,
      skillLearning,
      aiNews,
      aiTrends,
      pricing,
      toolDetail,
      legalDetail,
    ]) {
      expect(source).toContain("<main");
    }
  });

  it("only emits English AI news alternates when the English article is indexable", () => {
    const newsDetail = read("src/app/ai-news/[slug]/page-shell.tsx");
    const publicContent = read("src/lib/public-content.ts");

    expect(newsDetail).toContain("hasIndexableEnglishPage");
    expect(newsDetail).toContain("buildAvailableLanguageAlternates");
    expect(newsDetail).toContain(
      'hasIndexableEnglishPage ? ["zh", "en"] : ["zh"]',
    );
    expect(publicContent).toContain('filters.locale === "en"');
    expect(publicContent).toContain("isEnglishNewsArticleIndexable");
  });
});
