import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage SaaS redesign source", () => {
  it("uses localized homepage copy, keeps the hero isolated to the first viewport, and keeps all six recommended tools inside the featured content card", () => {
    const page = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8");
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const dictionaries = readFileSync(new URL("../lib/dictionaries.ts", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(page).toContain('className="home-page-shell"');
    expect(page).toContain("home-hero-shell");
    expect(page).toContain("home-hero-stage");
    expect(page).toContain("home-hero-centered");
    expect(page).not.toContain('className="home-hero-intro"');
    expect(page).not.toContain("home-hero-background");
    expect(page).not.toContain("home-hero-unicorn-remix");
    expect(page).toContain('id="updates" className="home-featured-shell"');
    expect(page.indexOf("home-featured-shell")).toBeGreaterThan(page.indexOf("home-hero-actions"));
    expect(page).toContain("t.home.eyebrow");
    expect(page).toContain("t.home.title");
    expect(page).toContain("t.home.titleSecondLine");
    expect(page).toContain("t.home.titleSecondLineEn");
    expect(page).not.toContain("home-hero-metrics");
    expect(page).toContain('className="home-hero-eyebrow backdrop-blur-xl backdrop-saturate-150"');
    expect(page).not.toContain("t.home.metricsExploreTitle");
    expect(page).not.toContain("t.home.metricsExplore");
    expect(page).not.toContain("t.home.metricsOutcome");
    expect(page).toContain("t.home.softwareButton");
    expect(page).toContain("t.home.onlineButton");
    expect(page).toContain("t.home.aiNewsButton");
    expect(page).toContain("t.home.skillLearningButton");
    expect(page).not.toContain("HomeGooeyNav");
    expect(page).not.toContain("const heroCtaItems = [");
    expect(page).toContain('className="home-hero-cta home-hero-cta-primary backdrop-blur-xl backdrop-saturate-150"');
    expect(page).toContain('className="home-hero-cta home-hero-cta-accent backdrop-blur-xl backdrop-saturate-150"');
    expect(page).toContain('href={forceLocale === "en" ? "/en/account-services" : "/account-services"}');
    expect(page).toContain('href={forceLocale === "en" ? "/en/ai-news" : "/ai-news"}');
    expect(page).toContain('href={forceLocale === "en" ? "/en/skill-learning" : "/skill-learning"}');
    expect(page).toContain("t.home.featuredContentTitle");
    expect(page).toContain("t.home.featuredContentIntro");
    expect(page).not.toContain("take: 40");
    expect(page).not.toContain("recommendedTools.slice(previewTools.length)");
    expect(page).toContain("getHomeRecommendedTools");
    expect(page).toContain("getEffectiveLocalizedHomeHeroIntro(settings, forceLocale, t.home.intro)");
    expect(page).not.toContain('href="/account-services" variant="ghost" className="home-preview-link"');
    expect(page).toContain('href={forceLocale === "en" ? "/en/software" : "/software"}');
    expect(page).toContain('href={forceLocale === "en" ? "/en/account-services" : "/account-services"}');
    expect(page).toContain('href={forceLocale === "en" ? "/en/ai-news" : "/ai-news"}');
    expect(page).toContain('href={forceLocale === "en" ? "/en/skill-learning" : "/skill-learning"}');
    expect(page).toContain("home-product-preview backdrop-blur-xl backdrop-saturate-150");
    expect(page).not.toContain("HeroLogoMark");
    expect(page).not.toContain("enhe-orbital-system");
    expect(page).not.toContain("enhe-circuit-line");
    expect(page).not.toContain("enhe-signal");
    expect(page).not.toContain("home-hero-scroll-cue");

    expect(header).toContain("t.nav.home");
    expect(header).toContain("t.nav.login");
    expect(header).toContain("{t.nav.user}");

    expect(dictionaries).toContain('titleSecondLine: "与 AI 共生，在变化中觉醒，用创造重塑未来"');
    expect(dictionaries).toContain('titleSecondLineEn: "Coexist with AI. Awaken through change. Create the future"');
    expect(dictionaries).toContain('metricsExploreTitle: "Explore Freely"');
    expect(dictionaries).toContain('metricsExplore: "Open More Possibilities with AI"');
    expect(dictionaries).toContain('featuredContentTitle: "Featured Content"');

    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("--marketing-bg: #22242a");
    expect(css).not.toContain("color-scheme: light");
    expect(css).not.toContain("--marketing-bg: #ffffff");
    expect(css).not.toContain(".site-brand-logo-light");
    expect(css).toContain("--marketing-accent: #f05a35");
    expect(css).toContain("--font-sans: 'Montserrat', 'Microsoft YaHei', 'Microsoft YaHei UI'");
    expect(css).toContain("--font-heading-zh: 'Montserrat', 'Microsoft YaHei', 'Microsoft YaHei UI'");
    expect(css).toContain(".home-page-shell");
    expect(css).toContain(".home-hero-stage");
    expect(css).toContain(".home-hero-centered");
    expect(css).not.toContain(".home-hero-metrics");
    expect(css).toContain(".home-featured-shell");
    expect(css).toContain("scroll-margin-top: 96px");
    expect(css).toContain(".home-hero-actions {\n  display: flex;");
    expect(css).toContain(".home-hero-actions {\n    width: 100%;\n    flex-wrap: wrap;");
    expect(css).toContain(".home-hero-cta {\n    flex: 1 1 calc(50% - 10px);");
    expect(css).not.toContain(".home-gooey-nav-list");
    expect(css).toContain("white-space: pre-line");
    expect(css).toContain(".home-product-preview {\n  width: min(100%, 1040px);\n  margin: 0 auto;");
    expect(css).not.toContain(".enhe-orbital-system");
    expect(css).not.toContain(".home-hero-scroll-cue");
  });

  it("emphasizes the bilingual hero promise with React Bits ScrollVelocity while keeping SEO-readable text", () => {
    const page = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const scrollVelocity = readFileSync(new URL("../components/scroll-velocity.tsx", import.meta.url), "utf8");

    expect(page).toContain('import { ScrollVelocity } from "@/components/scroll-velocity";');
    expect(page).toContain("const heroVelocityTexts = [t.home.titleSecondLine, t.home.titleSecondLineEn];");
    expect(page).toContain('<span className="sr-only"> {heroVelocityTexts.join(" ")}</span>');
    expect(page).toContain('<div className="home-hero-title-emphasis" aria-hidden="true">');
    expect(page).toContain('texts={heroVelocityTexts}');
    expect(page).not.toContain('<span className="home-hero-title-emphasis" aria-hidden="true">');
    expect(css).toContain(".home-hero-title-emphasis");
    expect(css).toContain(".home-hero-velocity-parallax");
    expect(css).toContain(".home-hero-velocity-scroller");
    expect(css).toContain(".home-hero-velocity-copy");
    expect(css).toContain("color: var(--marketing-accent)");
    expect(css).toContain("animation: hero-title-breathe");
    expect(css).toContain("@keyframes hero-title-breathe");
    expect(css).toContain("text-shadow:");
    expect(css).toContain(".home-hero-title-emphasis {\n    animation: none");
    expect(scrollVelocity).toContain('velocity = 100');
    expect(scrollVelocity).toContain('damping = 50');
    expect(scrollVelocity).toContain('stiffness = 400');
    expect(scrollVelocity).toContain('numCopies = 6');
    expect(scrollVelocity).toContain('velocityMapping = { input: [0, 1000], output: [0, 5] }');
    expect(scrollVelocity).toContain('parallaxClassName = "parallax"');
    expect(scrollVelocity).toContain('scrollerClassName = "scroller"');
    expect(scrollVelocity).toContain('from "motion/react"');
    expect(scrollVelocity).toContain("useAnimationFrame");
    expect(scrollVelocity).toContain("useVelocity(scrollY)");
    expect(scrollVelocity).toContain("baseVelocity={index % 2 !== 0 ? -velocity : velocity}");
  });

  it("uses simplified product cards in the homepage featured preview without changing the full card contract", () => {
    const page = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8");
    const toolCard = readFileSync(new URL("../components/tool-card.tsx", import.meta.url), "utf8");

    expect(page).toContain('<ToolCard key={tool.id} tool={tool} locale={forceLocale} variant="homeFeatured" />');
    expect(toolCard).toContain('variant?: "default" | "homeFeatured"');
    expect(toolCard).toContain('variant = "default"');
    expect(toolCard).toContain('const showMarketingMeta = variant !== "homeFeatured"');
    expect(toolCard).toContain("{showMarketingMeta ? (");
    expect(toolCard).toContain("t.toolCard.audienceLabel");
    expect(toolCard).toContain("buildCardHighlights");
  });

  it("applies the new Chinese display font to the homepage header, call-to-action buttons, and slogan copy while keeping the header text white", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(css).toContain("html[lang='zh-CN'] :is(");
    expect(css).toContain(".site-brand-wordmark");
    expect(css).toContain(".site-nav-link");
    expect(css).toContain(".site-login-link");
    expect(css).toContain(".site-admin-link");
    expect(css).toContain(".site-user-chip");
    expect(css).toContain(".site-user-center-cta");
    expect(css).toContain(".site-language-switcher a");
    expect(css).toContain(".home-hero-eyebrow");
    expect(css).toContain(".home-hero-intro");
    expect(css).toContain(".home-hero-velocity-copy");
    expect(css).not.toContain(".home-hero-metrics strong");
    expect(css).not.toContain(".home-hero-metrics span");
    expect(css).toContain(".home-hero-cta");
    expect(css).toContain("font-family: var(--font-heading-zh)");
    expect(css).toContain(".site-nav-link,\n.site-login-link,\n.site-admin-link {\n  min-height: 44px;\n  align-items: center;\n  border-radius: 999px;\n  color: var(--marketing-text);");
    expect(css).toContain(".site-user-center-cta {\n  align-items: center;");
    expect(css).toContain(".site-header-actions > .site-login-link,\n.site-header-actions > .site-user-center-cta,\n.site-header-actions > .site-user-chip {\n  display: none;");
    expect(css).toContain(".site-header-actions > .site-login-link,\n  .site-header-actions > .site-user-center-cta,\n  .site-header-actions > .site-user-chip {\n    display: inline-flex;");
    expect(css).toContain("background: #ffffff;\n  color: #050505;");
    expect(css).toContain(".site-user-center-cta,\n.mobile-nav-user-center {\n  background: #ffffff !important;\n  color: #050505 !important;");
    expect(css).toContain(".site-language-switcher a {\n  display: inline-flex;\n  min-height: 34px;\n  align-items: center;\n  justify-content: center;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--marketing-text);");
    expect(css).toContain(".site-language-switcher a.is-active {\n  background: #050505;");
  });

  it("adds more breathing room between the two hero title lines", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(css).toContain(".home-hero-title {\n  display: grid;\n  gap: 0.8736em;");
    expect(css).toContain("margin: clamp(0.715rem, 1.365vw, 1.235rem) auto 0");
    expect(css).toContain("gap: 0.58em;");
  });

  it("polishes the hero label, CTA contrast, and footer while preserving SEO and GEO source contracts", () => {
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    const page = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8");
    const publicChrome = readFileSync(new URL("../components/public-site-chrome.tsx", import.meta.url), "utf8");

    expect(css).toContain(".home-hero-eyebrow {");
    expect(css).toContain("display: inline-flex;");
    expect(css).toContain("border: 1px solid rgba(255, 255, 255, 0.22)");
    expect(css).toContain("background-color: transparent");
    expect(css).toContain("background-image: none");
    expect(css).toContain("--home-hero-eyebrow-filter: blur(18px) saturate(150%)");
    expect(css).toContain("backdrop-filter: var(--home-hero-eyebrow-filter)");
    expect(css).toContain("border-radius: 11px !important");
    expect(css).toContain("--home-hero-cta-filter: blur(20px) saturate(165%) contrast(1.04)");
    expect(css).toContain("backdrop-filter: var(--home-hero-cta-filter) !important");
    expect(css).toContain("border: 1px solid rgba(255, 255, 255, 0.24) !important");
    expect(css).toContain("background-color: transparent !important");
    expect(css).toContain("background-image: none !important");
    expect(css).toContain(".home-hero-cta-primary,\n.home-hero-cta-accent {\n  background: transparent");
    expect(css).toContain("color: #ffffff");
    expect(css).not.toContain(".home-gooey-effect.filter");
    expect(css).not.toContain(".home-gooey-particle");
    expect(css).not.toContain("@keyframes home-gooey-particle");
    expect(css).not.toContain("--home-gooey-filter");
    expect(css).not.toContain("radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.24)");
    expect(css).not.toContain(".home-hero-cta-accent {\n  background: var(--marketing-accent)");
    expect(css).not.toContain("background-color: rgba(240, 90, 53, 0.94)");
    expect(page).toContain("<ButtonLink");
    expect(page).not.toContain("home-gooey-nav");

    expect(footer).toContain("footerGroups");
    expect(footer).toContain("footerSocialLinks");
    expect(footer).toContain('label: "Gmail"');
    expect(footer).toContain('label: "小红书"');
    expect(footer).toContain('label: "抖音"');
    expect(footer).toContain('label: "YouTube"');
    expect(footer).toContain("site-footer-gradient-mark");
    expect(footer).toContain("buildLocalePath");
    expect(footer).toContain("legalPages.map");

    expect(page).toContain("generateHomePageMetadata");
    expect(publicChrome).toContain("buildWebsiteSchema");
    expect(publicChrome).toContain("buildOrganizationSchema");
    expect(css).not.toContain(".home-hero-background");
    expect(css).not.toContain("home-hero-unicorn-remix");
  });
});
