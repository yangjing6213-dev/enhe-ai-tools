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
const tokens = read("src/styles/redesign/tokens.css");

describe("homepage UI polish", () => {
  it("places the new brand line with the logo and centers a light, dark-ink hero", () => {
    expect(HOME_COPY.zh.label).toBe("给你的人生添加AI外挂");
    expect(hero).not.toContain("redesign-home-mobile-label");
    expect(header).toMatch(/EnheBrandLockup[\s\S]*redesign-brand-label/);
    expect(shellStyles).toMatch(/\.redesign-brand-region\s*\{[^}]*justify-items:\s*center/);
    expect(shellStyles).toMatch(/\.redesign-brand-label\s*\{[^}]*background:\s*var\(--enhe-action/);
    expect(shellStyles).not.toMatch(/\.redesign-brand-label,\s*\.redesign-desktop-nav\s*\{\s*display:\s*none/);
    expect(refreshStyles).toMatch(/\.redesign-header\[data-home="true"\][^{]*\{[^}]*background:\s*var\(--enhe-page-bg\)[^}]*color:\s*var\(--enhe-text\)/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*background-image:\s*none[^}]*color:\s*var\(--enhe-text\)/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero-inner\s*\{[^}]*text-align:\s*center/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*min-height:\s*clamp\(560px,\s*44vw,\s*680px\)/);
    expect(refreshStyles).toMatch(/\.redesign-home \.redesign-home-hero-inner\s*\{[^}]*padding:\s*clamp\(84px,\s*10vw,\s*128px\)/);
    expect(homeStyles).toMatch(/@font-face\s*\{[^}]*font-family:\s*"LXGW WenKai"[^}]*src:\s*url\("\/fonts\/lxgw-wenkai\/lxgw-wenkai-home-label\.woff"\)/);
    expect(shellStyles).toMatch(/\.redesign-brand-label\s*\{[^}]*font-family:\s*"LXGW WenKai"/);
  });

  it("orders the language control before the account and keeps its menu readable", () => {
    const desktopNav = header.slice(header.indexOf('<nav className="redesign-desktop-nav"'), header.indexOf("</nav>"));

    expect(desktopNav.indexOf("<EnheRedesignLanguageSwitch")).toBeLessThan(
      desktopNav.indexOf('<details className="redesign-account-menu">'),
    );
    expect(shellStyles).toMatch(/\.redesign-avatar-menu\s*\{[^}]*color:\s*var\(--enhe-text\)/);
    expect(shellStyles).toMatch(/\.redesign-language-switch\s*\{[^}]*border:\s*1px solid var\(--enhe-border\)/);
    expect(shellStyles).toMatch(/\.redesign-avatar-trigger\s*\{[^}]*border:\s*1px solid var\(--enhe-border\)/);
    expect(shellStyles).toMatch(/\.redesign-desktop-nav\s*\{[^}]*gap:\s*clamp\(/);
    expect(shellStyles).toMatch(/\.redesign-desktop-nav\s*\{[^}]*letter-spacing:\s*0\.(?:015|025)em/);
  });

  it("removes dividers from the four homepage feature cards", () => {
    expect(refreshStyles).toMatch(/\.redesign-home-features-inner\s*\{[^}]*border:\s*0/);
    expect(refreshStyles).toMatch(/\.redesign-home-feature-card\s*\{[^}]*border:\s*0/);
  });

  it("removes the product counter, shrinks the heading, and uses triangle controls", () => {
    expect(showcase).not.toContain("redesign-home-product-counter");
    expect(showcase).not.toContain("const counter =");
    expect(showcase).toContain("redesign-home-product-triangle");
    expect(showcase).toContain("redesign-home-product-link-triangle");
    expect(homeStyles).toMatch(/\.redesign-home-products-heading h2\s*\{[^}]*font-size:\s*clamp\([^}]*2\.25rem\)[^}]*white-space:\s*nowrap/);
    expect(homeStyles).toMatch(/\.redesign-home-product-control\s*\{[^}]*border:\s*0[^}]*border-radius:\s*0/);
    expect(refreshStyles).toMatch(/\.redesign-home-product-media-frame\s*\{[^}]*overflow:\s*hidden[^}]*border-radius:\s*20px/);
  });

  it("places unframed review triangles beside the rotating review card", () => {
    expect(reviews).toMatch(/redesign-home-reviews-window[\s\S]*redesign-home-reviews-controls[\s\S]*<\/div>\s*<\/div>/);
    expect(reviews).toContain("redesign-home-review-triangle");
    expect(homeStyles).toMatch(/\.redesign-home-reviews-controls\s*\{[^}]*position:\s*absolute[^}]*align-items:\s*center/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-control\s*\{[^}]*border:\s*0[^}]*border-radius:\s*0/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-inner\s*\{[^}]*width:\s*min\(100%,\s*1040px\)/);
    expect(homeStyles).toMatch(/\.redesign-home-review-card\s*\{[^}]*width:\s*min\(70vw,\s*600px\)/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-inner h2\s*\{[^}]*font-size:\s*clamp\(1rem,\s*2\.2vw,\s*2\.25rem\)/);
    expect(reviews).toContain("copy.resume");
    expect(reviews).toContain("copy.pause");
    expect(reviews).toContain('<Pause aria-hidden="true"');
    expect(reviews).not.toContain("暂停自动播放");
    expect(reviews).not.toContain("Pause automatic playback");
    expect(HOME_COPY.zh.review.disclosure).toBe("AI生成展示内容，不代表真实用户评价。");
    expect(reviews).not.toContain("以下人物与评价内容由 AI 生成，仅作页面展示示意，并非真实用户评价。");
  });

  it("uses accessible expandable footer groups and a back-to-top link on the AppSumo-like surface", () => {
    expect(footer).toContain('<details className="footer-group">');
    expect(footer).not.toContain('<details className="footer-group" open>');
    expect(footer).toContain('className="footer-back-to-top footer-back-to-top-button"');
    expect(footer).toContain('href="#top"');
    expect(footer).toContain('className="footer-back-to-top-row"');
    expect(footer.indexOf("footer-back-to-top-row")).toBeLessThan(footer.indexOf('className="footer-grid"'));
    expect(header).toContain('id="top"');
    expect(tokens).toContain("--enhe-footer: #001512");
    expect(refreshStyles).toMatch(/\.redesign-footer\s*\{[^}]*background:\s*var\(--enhe-footer\)/);
    expect(shellStyles).toMatch(/\.redesign-footer-inner\s*\{[^}]*position:\s*relative/);
    expect(shellStyles).toMatch(/\.footer-back-to-top-row\s*\{[^}]*display:\s*flex[^}]*justify-content:\s*flex-end/);
  });

  it("removes the horizontal rules between homepage sections", () => {
    for (const selector of [".redesign-home-brand-value", ".redesign-home-products", ".redesign-home-reviews"]) {
      const rule = homeStyles.match(new RegExp(`${selector.replaceAll(".", "\\.")}\\s*\\{([^}]*)\\}`));
      expect(rule?.[1] ?? "").not.toMatch(/border-top:\s*1px solid/);
    }
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
