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
    expect(buildHomeMetadataTitle("zh", dictionaries.zh.brand)).toBe(
      "恩禾 ENHE AI | AI工具、AI资讯、账号服务与技能课程",
    );
    expect(buildHomeMetadataTitle("en", dictionaries.en.brand)).toBe(
      "ENHE AI | AI Tools, News, Account Services & Courses",
    );

    expect(dictionaries.zh.listing.softwareIntro.length).toBeGreaterThanOrEqual(50);
    expect(dictionaries.zh.listing.onlineIntro.length).toBeGreaterThanOrEqual(50);
    expect(dictionaries.zh.listing.skillLearningIntro.length).toBeGreaterThanOrEqual(50);
    expect(dictionaries.zh.pricing.intro.length).toBeGreaterThanOrEqual(50);
  });

  it("keeps useful internal links after removing homepage featured content", () => {
    const homeShell = read("src/app/page-shell.tsx");

    expect(dictionaries.zh.home.featuredContentEmpty).not.toContain("后台设置");
    expect(dictionaries.en.home.featuredContentEmpty).not.toContain("admin panel");
    expect(homeShell).not.toContain("home-fallback-link-grid");
    expect(homeShell).not.toContain("home-featured-shell");
    expect(homeShell).toContain("home-support-link-grid");
    expect(homeShell).toContain('"/ai-news"');
    expect(homeShell).toContain('"/pricing"');
  });

  it("keeps the homepage growth hub linked to major SEO and conversion paths", () => {
    const homeShell = read("src/app/page-shell.tsx");

    for (const path of [
      '"/ai-news"',
      '"/ai-trends"',
      '"/software"',
      '"/skill-learning"',
      '"/product-paths/work-efficiency"',
      '"/product-paths/media-generation"',
      '"/pricing"',
      '"/tutorials"',
      '"/build-your-own-x"',
    ]) {
      expect(homeShell).toContain(path);
    }

    expect(homeShell).toContain("homeTaskOutcomes");
    expect(homeShell).toContain("homeSupportLinks");
    expect(homeShell).toContain("home-seo-disclosure");
  });

  it("keeps P2 topic-growth links discoverable inside the folded homepage support area", () => {
    const homeShell = read("src/app/page-shell.tsx");
    const globals = read("src/app/globals.css");

    for (const path of [
      '"/ai-topics/ai-content-creation-tools"',
      '"/ai-topics/local-ai-deployment"',
      '"/ai-topics/ai-account-service-compliance"',
      '"/ai-topics/ai-skill-learning-path"',
    ]) {
      expect(homeShell).toContain(path);
    }

    expect(homeShell).toContain("homeTopicGrowthLinks");
    expect(homeShell).toContain("home-topic-growth-grid");
    expect(homeShell.indexOf("home-topic-growth-grid")).toBeGreaterThan(
      homeShell.indexOf("home-seo-disclosure"),
    );
    expect(globals).toContain(".home-topic-growth-grid");
    expect(globals).toContain(".home-topic-growth-link");
  });

  it("gives robots and sitemap public cache headers", () => {
    const nextConfig = read("next.config.ts");

    expect(nextConfig).toContain('source: "/robots.txt"');
    expect(nextConfig).toContain('source: "/sitemap.xml"');
    expect(nextConfig).toContain("stale-while-revalidate=86400");
  });

  it("treats zh AI news routes as Chinese public pages in middleware", () => {
    const middleware = read("src/middleware.ts");

    expect(middleware).toContain('"/ai-news"');
    expect(middleware).toContain('pathname.startsWith("/ai-news/")');
  });

  it("renders AI news publish dates with machine-readable time tags", () => {
    const newsDetail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(newsDetail).toContain("<time");
    expect(newsDetail).toContain("dateTime=");
  });

  it("keeps tool detail CTAs, course copy, and purchase form fields readable", () => {
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");

    expect(toolDetail).not.toContain("鐐");
    expect(toolDetail).not.toContain("楼");
    expect(toolDetail).toContain("freeDownloadButtonLabel");
    expect(toolDetail).toContain("priceSpecHelpId");
    expect(toolDetail).toContain("paidSkillCourse && !hasDownloadPurchase");
    expect(toolDetail).toContain('const priceFallback = tool.type === "software" ? tool.downloadPrice : 0;');
    expect(toolDetail).not.toContain("isSkillLearning && !hasDownloadPurchase");
    expect(toolDetail).toContain("paymentMethodLabelId");
    expect(toolDetail).toContain('aria-describedby={priceSpecHelpId}');
    expect(toolDetail).toContain('aria-describedby={paymentMethodHelpId}');
    expect(toolDetail).toContain('required');
    expect(toolDetail).toContain('title=');
    expect(dictionaries.zh.toolDetail.buyDownload).toBe("购买并获取下载 ¥{price}");
    expect(dictionaries.zh.toolDetail.buyService).toBe("咨询并购买服务");
    expect(dictionaries.zh.toolDetail.buyCourse).toBe("购买课程 ¥{price}");
  });

  it("does not use stale download prices as account-service or course purchase prices", () => {
    const publicActions = read("src/app/actions.ts");
    const adminActions = read("src/app/admin/actions.ts");
    const access = read("src/lib/access.ts");

    expect(publicActions).toContain('const fallbackOrderAmount = tool.type === "software" ? tool.downloadPrice : 0;');
    expect(adminActions).toContain('primaryPriceSpec?.price ?? (type === "software" ? parseNumberField(formData.get("downloadPrice"), 0) : 0)');
    expect(access).toContain("getPrimaryToolPrice(tool.priceSpecs, 0)");
  });

  it("clips homepage motion and glow effects horizontally", () => {
    const globals = read("src/app/globals.css");

    expect(globals).toContain("overflow-x: clip");
    expect(globals).toContain("@supports not (overflow: clip)");
    expect(globals).toContain("overflow-x: hidden");
  });

  it("uses absolute URLs in account service collection schema", () => {
    const accountServices = read("src/app/account-services/page-shell.tsx");

    expect(accountServices).toContain("absoluteUrl");
    expect(accountServices).toContain('const url = absoluteUrl(buildLocalePath("/account-services", forceLocale));');
  });

  it("adds an offer catalog schema to the pricing page", () => {
    const pricingPage = read("src/app/pricing/page-shell.tsx");
    const pricingOffers = read("src/lib/pricing-offers.ts");
    const pricingMarkdown = read("public/pricing.md");

    expect(pricingPage).toContain('"@type": "OfferCatalog"');
    expect(pricingPage).toContain("pricingOfferCatalogSchema");
    expect(pricingPage).toContain("pricingOfferItems");
    expect(pricingOffers).toContain('path: "/software/windows-ai"');
    expect(pricingOffers).toContain("price: 50");
    expect(pricingOffers).toContain('path: "/account-services/gmail-google"');
    expect(pricingOffers).toContain("price: 30.8");
    expect(pricingPage).toContain("StructuredData data={[breadcrumbSchema, pricingOfferCatalogSchema]}");
    expect(pricingMarkdown).toContain("https://www.enhe-tech.com.cn/software/windows-ai");
    expect(pricingMarkdown).toContain("Price: CNY 50.00");
    expect(pricingMarkdown).toContain("https://www.enhe-tech.com.cn/account-services/gmail-google");
    expect(pricingMarkdown).toContain("Price: CNY 30.80");
  });

  it("keeps product demos in a single-column layout without horizontal scrolling", () => {
    const globals = read("src/app/globals.css");
    const productDemoGridBlock = globals.slice(
      globals.indexOf(".home-product-demo-grid {"),
      globals.indexOf(".product-demo-list-grid {"),
    );

    expect(productDemoGridBlock).toContain("display: flex");
    expect(productDemoGridBlock).toContain("flex-direction: column");
    expect(productDemoGridBlock).not.toContain("overflow-x");
    expect(productDemoGridBlock).not.toContain("margin-right: -1rem");
  });
});
