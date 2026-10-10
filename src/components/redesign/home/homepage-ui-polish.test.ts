import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_COPY } from "@/lib/redesign/home/home-copy";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

const hero = read("src/components/redesign/home/EnheRedesignHero.tsx");
const showcase = read("src/components/redesign/home/EnheRedesignProductShowcase.tsx");
const reviews = read("src/components/redesign/home/EnheRedesignExperienceReviews.tsx");
const header = read("src/components/redesign/enhe-redesign-header.tsx");
const footer = read("src/components/redesign/enhe-redesign-footer.tsx");
const homeStyles = read("src/styles/redesign/home.css");
const shellStyles = read("src/styles/redesign/shell.css");
const refreshStyles = read("src/styles/redesign/site-refresh.css");
const softwareStyles = read("src/styles/redesign/software.css");
const tokens = read("src/styles/redesign/tokens.css");
const globalStyles = read("src/app/globals.css");

describe("homepage UI polish", () => {
  it("removes the tagline while keeping the centered light hero", () => {
    expect(HOME_COPY.zh.label).toBe("给你的人生添加AI外挂");
    expect(hero).not.toContain("redesign-home-mobile-label");
    expect(header).not.toContain("redesign-brand-label");
    expect(shellStyles).toMatch(/\.redesign-brand-region\s*\{[^}]*justify-items:\s*center/);
    expect(refreshStyles).toMatch(/\.redesign-header\[data-home="true"\][^{]*\{[^}]*background:\s*var\(--enhe-page-bg\)[^}]*color:\s*var\(--enhe-text\)/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*background-image:\s*none[^}]*color:\s*var\(--enhe-text\)/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero-inner\s*\{[^}]*text-align:\s*center/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*min-height:\s*clamp\(560px,\s*44vw,\s*680px\)/);
    expect(refreshStyles).toMatch(/\.redesign-home \.redesign-home-hero-inner\s*\{[^}]*padding:\s*clamp\(84px,\s*10vw,\s*128px\)/);
    expect(tokens).toContain('--enhe-font-brand-label: "LXGW WenKai Lite"');
    expect(globalStyles).toContain("font-family: 'LXGW WenKai Lite'");
    expect(globalStyles).toContain("/fonts/lxgw-wenkai/lxgw-wenkai-home-label.woff");
  });

  it("uses the shared theme background on homepage and product fallback surfaces", () => {
    expect(homeStyles).toMatch(/\.redesign-home\s*\{[^}]*background-color:\s*var\(--enhe-page-bg\)/);
    expect(homeStyles).toMatch(/\.redesign-home-product-media-fallback\s*\{[^}]*background:\s*color-mix\([^}]*var\(--enhe-surface/);
    expect(homeStyles).not.toMatch(/#fdfcf7|253,\s*252,\s*247/);
  });

  it("keeps primary control text white on the blue buttons", () => {
    expect(refreshStyles).toMatch(/\.redesign-home \.redesign-home-cta,[\s\S]*?\.redesign-home-brand-value-cta\s*\{[^}]*color:\s*#fff/);
    expect(refreshStyles).toMatch(/\.redesign-home \.redesign-home-cta:hover,[\s\S]*?\.redesign-home-brand-value-cta:hover\s*\{[^}]*color:\s*#fff/);
    expect(softwareStyles).toMatch(/\.redesign-software-category-button\[data-selected="true"\]\s*\{[^}]*color:\s*#fff/);
    expect(softwareStyles).toMatch(/\.redesign-software-empty-action\s*\{[^}]*color:\s*#fff/);
    expect(softwareStyles).toMatch(/\.redesign-software-load-more-button\s*\{[^}]*color:\s*#fff/);
  });

  it("keeps language at the far right after the account control without a theme switch", () => {
    const accountControl = header.indexOf('className="redesign-account-menu"');
    const languageControl = header.indexOf("<EnheRedesignLanguageSwitch");

    expect(accountControl).toBeGreaterThanOrEqual(0);
    expect(header).not.toContain("ThemeToggle");
    expect(languageControl).toBeGreaterThan(accountControl);
    expect(shellStyles).toMatch(/\.redesign-avatar-menu\s*\{[^}]*color:\s*var\(--enhe-text\)/);
    expect(shellStyles).toMatch(/\.redesign-language-switch\s*\{[^}]*border:\s*0/);
    expect(shellStyles).toMatch(/\.redesign-avatar-trigger\s*\{[^}]*border:\s*0/);
    expect(shellStyles).toMatch(/\.redesign-desktop-nav\s*\{[^}]*gap:\s*clamp\(/);
    expect(shellStyles).toMatch(/\.redesign-desktop-nav\s*\{[^}]*letter-spacing:\s*0\.(?:015|025)em/);
  });

  it("removes dividers from the four homepage feature cards", () => {
    expect(refreshStyles).toMatch(/\.redesign-home-features-inner\s*\{[^}]*border:\s*0/);
    expect(refreshStyles).toMatch(/\.redesign-home-feature-card\s*\{[^}]*border:\s*0/);
  });

  it("removes the product counter, centers concise copy, and uses Iconfont arrows", () => {
    expect(showcase).not.toContain("redesign-home-product-counter");
    expect(showcase).not.toContain("const counter =");
    expect(showcase).toContain("redesign-home-product-triangle");
    expect(showcase).toContain("redesign-home-product-link-triangle");
    expect(showcase).toContain('icon="arrow-left-bold"');
    expect(showcase).toContain('icon="arrow-right-bold"');
    expect(showcase).toContain('icon="arrow-right"');
    expect(homeStyles).toMatch(/\.redesign-home-products-heading\s*\{[^}]*text-align:\s*center/);
    expect(homeStyles).toMatch(/\.redesign-home-products-eyebrow\s*\{[^}]*font-size:\s*2rem/);
    expect(homeStyles).toMatch(/\.redesign-home-products-heading h2\s*\{[^}]*font-size:\s*clamp\([^}]*1\.2rem\)/);
    expect(homeStyles).not.toMatch(/\.redesign-home-products-heading h2\s*\{[^}]*white-space:\s*nowrap/);
    expect(homeStyles).toMatch(/\.redesign-home-product-control\s*\{[^}]*border:\s*0[^}]*border-radius:\s*0/);
    expect(refreshStyles).toMatch(/\.redesign-home-product-media-frame\s*\{[^}]*overflow:\s*hidden[^}]*border-radius:\s*20px/);
  });

  it("removes side arrows from the rotating review card while preserving concise AI disclosure", () => {
    expect(reviews).not.toContain("redesign-home-reviews-controls");
    expect(reviews).not.toContain("redesign-home-review-triangle");
    expect(homeStyles).not.toContain(".redesign-home-reviews-controls");
    expect(homeStyles).not.toContain(".redesign-home-reviews-control");
    expect(homeStyles).toMatch(/\.redesign-home-reviews-inner\s*\{[^}]*width:\s*min\(100%,\s*1040px\)/);
    expect(homeStyles).toMatch(/\.redesign-home-review-card\s*\{[^}]*width:\s*min\(70vw,\s*600px\)/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-inner h2\s*\{[^}]*font-size:\s*2rem/);
    expect(reviews).toContain("copy.resume");
    expect(reviews).toContain("copy.pause");
    expect(reviews).toContain('<Pause aria-hidden="true"');
    expect(reviews).not.toContain("暂停自动播放");
    expect(reviews).not.toContain("Pause automatic playback");
    expect(HOME_COPY.zh.review.heading).toBe("客户的心得");
    expect(HOME_COPY.zh.review.disclosure).toBe("AI 生成示例（非真实用户反馈）");
    expect(HOME_COPY.en.review.heading).toBe("Customer stories");
    expect(HOME_COPY.en.review.disclosure).toBe("AI-generated examples (not real customer feedback).");
    expect(reviews).not.toContain("以下人物与评价内容由 AI 生成，仅作页面展示示意，并非真实用户评价。");
    expect(refreshStyles).toMatch(/\.redesign-home-reviews-disclosure\s*\{[^}]*color:\s*#fff/);
    expect(refreshStyles).toMatch(/\.redesign-home-reviews-disclosure\s*\{[^}]*background:\s*var\(--blue-11/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-rotation\s*\{[^}]*color:\s*#000/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-rotation\s*\{[^}]*background:\s*transparent/);
  });

  it("keeps narrow-phone review cards readable without clipped neighboring reviews", () => {
    expect(homeStyles).toMatch(/@media\s*screen and \(width < 480px\)[\s\S]*?\.redesign-home-review-card\s*\{[^}]*width:\s*min\(100%,\s*520px\)[^}]*\}[\s\S]*?\.redesign-home-review-card:not\(\[data-position="0"\]\)\s*\{[^}]*visibility:\s*hidden/);
  });

  it("uses collapsed expandable footer groups without a back-to-top link", () => {
    expect(footer).toContain('<details className="footer-group">');
    expect(footer).not.toContain('<details className="footer-group" open>');
    expect(footer).not.toContain("footer-back-to-top");
    expect(footer).not.toContain("backToTop");
    expect(header).toContain('id="top"');
    expect(tokens).toContain("--enhe-footer: #0D3A6D");
    expect(refreshStyles).toMatch(/\.redesign-footer\s*\{[^}]*background:\s*var\(--enhe-footer\)/);
    expect(shellStyles).toMatch(/\.redesign-footer-inner\s*\{[^}]*position:\s*relative/);
    expect(shellStyles).not.toContain(".footer-back-to-top-row");
    expect(footer).toContain('/images/brand/enhe-footer-wordmark.png');
    expect(read('src/components/redesign/enhe-brand-lockup.tsx')).toContain('/images/enhe-logo-white.png');
    expect(footer).toContain('alt={locale === "en" ? "ENHE brand" : "ENHE 品牌标志"}');
    expect(footer).not.toContain("brandIntro.map");
    expect(shellStyles).toMatch(/\.footer-group-trigger h3\s*\{[^}]*font-weight:\s*800/);
  });

  it("removes the horizontal rules between homepage sections", () => {
    for (const selector of [".redesign-home-brand-value", ".redesign-home-products", ".redesign-home-reviews"]) {
      const rule = homeStyles.match(new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{([^}]*)\\}`));
      expect(rule?.[1] ?? "").not.toMatch(/border-top:\s*1px solid/);
    }
    expect(refreshStyles).toMatch(/\.redesign-header\s*\{[^}]*border-bottom:\s*0\s*!important/);
    expect(refreshStyles).toMatch(/\.enhe-redesign-production\s+\.redesign-home-review-card:not\(\[data-position="0"\]\)\s*\{[^}]*border-color:\s*transparent\s*!important/);
  });

  it("removes decorative horizontal separators throughout public pages while preserving the admin shell", () => {
    expect(refreshStyles).toMatch(/\.enhe-redesign-production:not\(\.enhe-admin-shell\)\s+:is\(\.border-t,\s*\.border-b,\s*\.border-y,\s*hr\)\s*\{[^}]*border-block-color:\s*transparent\s*!important/);
    expect(refreshStyles).toContain(".redesign-mobile-nav-dropdown");
    expect(refreshStyles).toContain(".ai-news-page .ai-news-workspace-lead-grid");
    expect(refreshStyles).toContain(".enhe-contentless-hero");
    expect(refreshStyles).toContain(":not(.enhe-admin-shell)");
    expect(softwareStyles).not.toContain(".redesign-software-card-meta");
  });

  it("uses the Iconfont collection for all four homepage feature icons", () => {
    const features = read("src/components/redesign/home/EnheRedesignFeatures.tsx");
    const iconFont = read("src/components/redesign/enhe-iconfont-icon.tsx");
    expect(features).toContain('icon: "code"');
    expect(features).toContain('icon: "training"');
    expect(features).toContain('icon: "file-common"');
    expect(features).toContain('icon: "data-view"');
    expect(iconFont).toContain("cid=22664");
  });

  it("keeps catalog cards at one height and preserves the existing hover motion", () => {
    expect(softwareStyles).toMatch(/\.redesign-software-page\s*\{[^}]*width:\s*min\(100%,\s*1280px\)/);
    expect(softwareStyles).toMatch(/\.redesign-software-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(softwareStyles).toMatch(/\.redesign-software-card\s*\{[^}]*height:\s*602px[^}]*min-height:\s*0/);
    expect(softwareStyles).toMatch(/\.redesign-software-card\s*\{[^}]*border-radius:\s*0/);
    expect(softwareStyles).toMatch(/\.redesign-software-card:hover\s*\{[^}]*transform:\s*translateY\(-3px\)/);
    expect(softwareStyles).toMatch(/\.redesign-software-card-description\s*\{[^}]*-webkit-line-clamp:\s*3/);
  });

  it("keeps button feedback subtle, pointer-aware, and reduced-motion safe", () => {
    expect(refreshStyles).toMatch(/\.enhe-redesign-production :is\(button[^}]*transition:[\s\S]*?transform var\(--enhe-motion-fast\)/);
    expect(refreshStyles).toMatch(/@media \(hover:\s*hover\) and \(pointer:\s*fine\)/);
    expect(refreshStyles).toMatch(/button[^}]*:active[^{]*\{[^}]*transform:\s*[^;]+/);
    expect(refreshStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(tokens).toContain("--enhe-ease-ui-feedback: cubic-bezier(0.23, 1, 0.32, 1);");
    expect(refreshStyles).toMatch(/\.enhe-redesign-production \.redesign-home :is\([\s\S]*?\)\s*\{\s*transition-duration:\s*100ms;\s*transition-timing-function:\s*var\(--enhe-ease-ui-feedback\);/);
    expect(refreshStyles).toMatch(/\.enhe-redesign-production \.redesign-home :is\([\s\S]*?\):active\s*\{\s*transform:\s*scale\(0\.97\);\s*transition-duration:\s*140ms;/);
    expect(refreshStyles).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.enhe-redesign-production \.redesign-home :is\([\s\S]*?\)\s*\{\s*transition-property:\s*background-color,\s*border-color,\s*box-shadow,\s*color,\s*opacity\s*!important;\s*transition-duration:\s*var\(--enhe-motion-fast\)\s*!important;/);
  });
});
