import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("seo phase two source contracts", () => {
  it("keeps english public routing indexable and locale-aware", () => {
    const enLayout = read("src/app/en/layout.tsx");
    const publicChrome = read("src/components/public-site-chrome.tsx");
    const header = read("src/components/site-header.tsx");
    const headerSessionGate = read("src/components/header-session-gate.tsx");
    const headerAccountControls = read("src/components/header-account-controls.tsx");
    const footer = read("src/components/site-footer.tsx");

    expect(enLayout).toContain("RootDocument");
    expect(enLayout).toContain('lang="en-US"');
    expect(publicChrome).toContain("buildLanguageAlternates");
    expect(header).not.toContain('href={buildLocalePath("/user", locale)}');
    expect(headerSessionGate).toContain('userCenterItem={user ? [labels.user, buildLocalePath("/user", locale)] : undefined}');
    expect(headerAccountControls).toContain('const userPath = buildLocalePath("/user", locale);');
    expect(header).toContain('href={buildLocalePath("/login", locale)}');
    expect(footer).toContain("buildLocalePath");
  });

  it("keeps sitemap alternates and localized urls in the generated source", () => {
    const sitemap = read("src/app/sitemap.ts");
    const discovery = read("src/lib/public-discovery-manifest.ts");

    expect(discovery).toContain('path: "/en"');
    expect(discovery).toContain('path: "/en/software"');
    expect(discovery).toContain('path: "/en/account-services"');
    expect(discovery).not.toContain('path: "/en/online-tools"');
    expect(discovery).toContain('path: "/en/skill-learning"');
    expect(discovery).toContain('path: "/en/pricing"');
    expect(discovery).toContain('path: "/en/tutorials"');
    expect(sitemap).toContain("alternates:");
    expect(sitemap).toContain("languages:");
  });

  it("uses locale-specific website schema language and social-sharing assets", () => {
    const publicChrome = read("src/components/public-site-chrome.tsx");
    const layout = read("src/app/root-layout-shared.tsx");
    const seo = read("src/lib/seo.ts");

    expect(publicChrome).toContain('inLanguage: forceLocale === "en" ? "en-US" : "zh-CN"');
    expect(layout).toContain("icons:");
    expect(seo).toContain('export const defaultBrandIcon = "/images/brand/enhe-icon-gradient-white-bg-cropped.png"');
    expect(seo).toContain('export const defaultOgImage = "/images/brand/enhe-ai-og-1200x630.png"');
    expect(seo).toContain("width: 1200");
    expect(seo).toContain("height: 630");

    const ogImage = readFileSync(
      join(process.cwd(), "public/images/brand/enhe-ai-og-1200x630.png"),
    );
    expect(ogImage.readUInt32BE(16)).toBe(1200);
    expect(ogImage.readUInt32BE(20)).toBe(630);
  });

  it("keeps user-facing auth redirects locale-aware", () => {
    const actions = read("src/app/actions.ts");

    expect(actions).toContain('redirect(`${buildLocalePath("/user", locale)}?password=${encodeURIComponent("当前密码不正确")}`);');
    expect(actions).not.toContain('redirect(`/user?password=${encodeURIComponent("当前密码不正确")}`);');
  });

  it("keeps AI topic cluster routes static, localized, and schema-backed", () => {
    const shell = read("src/app/ai-topics/page-shell.tsx");
    const zhHub = read("src/app/(zh-public)/ai-topics/page.tsx");
    const zhDetail = read("src/app/(zh-public)/ai-topics/[slug]/page.tsx");
    const enHub = read("src/app/en/ai-topics/page.tsx");
    const enDetail = read("src/app/en/ai-topics/[slug]/page.tsx");

    expect(shell).toContain("generateAiTopicsHubMetadata");
    expect(shell).toContain("generateAiTopicDetailMetadata");
    expect(shell).toContain("generateAiTopicStaticParams");
    expect(shell).toContain("buildAiTopicCollectionSchema");
    expect(shell).toContain("buildFaqSchema");
    expect(shell).toContain("notFound()");
    expect(zhHub).toContain('forceLocale="zh"');
    expect(zhDetail).toContain('forceLocale: "zh"');
    expect(enHub).toContain('forceLocale="en"');
    expect(enDetail).toContain('forceLocale: "en"');
  });

  it("keeps AI topic cluster sitemap, locale switching, and internal links discoverable", () => {
    const sitemap = read("src/app/sitemap.ts");
    const discovery = read("src/lib/public-discovery-manifest.ts");
    const seo = read("src/lib/seo.ts");
    const home = read("src/app/page-shell.tsx");
    const software = read("src/app/software/page-shell.tsx");
    const skillLearning = read("src/app/skill-learning/page-shell.tsx");
    const accountServices = read("src/app/account-services/page-shell.tsx");

    expect(sitemap).toContain("sitemapExcludedPaths");
    expect(sitemap).toContain('"/ai-topics"');
    expect(sitemap).toContain('"/en/ai-topics"');
    expect(sitemap).not.toContain("aiTopicClusters");
    expect(discovery).not.toContain('path: "/ai-topics"');
    expect(discovery).not.toContain('path: "/en/ai-topics"');
    expect(sitemap).not.toContain("getAiTopicPath");
    expect(seo).toContain("/^\\/ai-topics$/");
    expect(seo).toContain("/^\\/ai-topics\\/.+$/");
    expect(home).toContain('"/ai-topics"');
    expect(software).toContain('"/ai-topics/ai-content-creation-tools"');
    expect(software).toContain('"/ai-topics/local-ai-deployment"');
    expect(skillLearning).toContain('"/ai-topics/ai-skill-learning-path"');
    expect(accountServices).toContain(
      '"/ai-topics/ai-account-service-compliance"',
    );
  });

  it("keeps growth pages covered by public cache and language headers", () => {
    const nextConfig = read("next.config.ts");
    const middleware = read("src/middleware.ts");

    expect(nextConfig).toContain('source: "/ai-topics"');
    expect(nextConfig).toContain('source: "/en/ai-topics"');
    expect(nextConfig).toContain('source: "/ai-topics/:slug*"');
    expect(nextConfig).toContain('source: "/en/ai-topics/:slug*"');
    expect(nextConfig).toContain('source: "/build-your-own-x"');
    expect(nextConfig).toContain('source: "/en/build-your-own-x"');
    expect(nextConfig).toContain(
      'source: "/okf/build-your-own-x/index.md"',
    );
    expect(middleware).toContain('"/ai-topics"');
    expect(middleware).toContain('"/build-your-own-x"');
    expect(middleware).toContain('pathname.startsWith("/ai-topics/")');
  });
});
