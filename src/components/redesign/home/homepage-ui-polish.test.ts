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
    expect(refreshStyles).toMatch(/\.redesign-header\[data-home="true"\][^{]*\{[^}]*background:\s*var\(--enhe-page-bg\)[^}]*color:\s*var\(--enhe-text\)/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero\s*\{[^}]*background-image:\s*none[^}]*color:\s*var\(--enhe-text\)/);
    expect(refreshStyles).toMatch(/\.redesign-home-hero-inner\s*\{[^}]*text-align:\s*center/);
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
  });

  it("places unframed review triangles beside the rotating review card", () => {
    expect(reviews).toMatch(/redesign-home-reviews-window[\s\S]*redesign-home-reviews-controls[\s\S]*<\/div>\s*<\/div>/);
    expect(reviews).toContain("redesign-home-review-triangle");
    expect(homeStyles).toMatch(/\.redesign-home-reviews-controls\s*\{[^}]*position:\s*absolute[^}]*align-items:\s*center/);
    expect(homeStyles).toMatch(/\.redesign-home-reviews-control\s*\{[^}]*border:\s*0[^}]*border-radius:\s*0/);
  });

  it("uses accessible expandable footer groups and a back-to-top link on the AppSumo-like surface", () => {
    expect(footer).toContain('<details className="footer-group" open>');
    expect(footer).toContain('className="footer-back-to-top footer-back-to-top-button"');
    expect(footer).toContain('href="#top"');
    expect(header).toContain('id="top"');
    expect(tokens).toContain("--enhe-footer: #001512");
    expect(refreshStyles).toMatch(/\.redesign-footer\s*\{[^}]*background:\s*var\(--enhe-footer\)/);
  });

  it("keeps button feedback subtle, pointer-aware, and reduced-motion safe", () => {
    expect(refreshStyles).toMatch(/\.enhe-redesign-production :is\(button[^}]*transition:[\s\S]*?transform var\(--enhe-motion-fast\)/);
    expect(refreshStyles).toMatch(/@media \(hover:\s*hover\) and \(pointer:\s*fine\)/);
    expect(refreshStyles).toMatch(/button[^}]*:active[^{]*\{[^}]*transform:\s*[^;]+/);
    expect(refreshStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
