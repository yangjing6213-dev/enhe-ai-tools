import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");
const shellStyles = readFileSync(join(sourceRoot, "styles/redesign/shell.css"), "utf8");
const siteRefreshStyles = readFileSync(join(sourceRoot, "styles/redesign/site-refresh.css"), "utf8");
const redesignStyles = `${shellStyles}\n${siteRefreshStyles}`;
const headerSource = readFileSync(join(sourceRoot, "components/redesign/enhe-redesign-header.tsx"), "utf8");
const footerSource = readFileSync(join(sourceRoot, "components/redesign/enhe-redesign-footer.tsx"), "utf8");

describe("public mascot decorations", () => {
  it("hangs the welcome tag from the AI trends navigation item", () => {
    expect(headerSource).toContain('item.href === (locale === "en" ? "/en/ai-trends" : "/ai-trends")');
    expect(headerSource).toContain('className="redesign-hanging-mascot"');
    expect(headerSource).toContain('src="/images/mascots/enhe-welcome-tag.webp"');
    expect(headerSource).toContain('aria-hidden="true"');
  });

  it("places the walking dino at the footer top as decoration", () => {
    expect(footerSource).toContain('className="redesign-footer-mascot"');
    expect(footerSource).toContain('src="/images/mascots/enhe-dino-mascot.webp"');
    expect(footerSource.indexOf('className="redesign-footer-mascot"')).toBeLessThan(
      footerSource.indexOf('<div className="redesign-footer-inner">'),
    );
  });

  it("keeps the header decoration desktop-only and respects reduced motion", () => {
    expect(redesignStyles).toMatch(/@media\s*\(min-width:\s*1024px\)[\s\S]*?\.redesign-hanging-mascot/);
    expect(redesignStyles).toContain("@keyframes enhe-hanging-tag-swing");
    expect(redesignStyles).toContain("@keyframes enhe-footer-mascot-walk");
    expect(redesignStyles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.redesign-hanging-mascot,\s*\.redesign-footer-mascot\s*\{\s*animation:\s*none/);
  });

  it("gives the footer mascot a visible, gentle walking motion", () => {
    expect(redesignStyles).toMatch(/@keyframes enhe-footer-mascot-walk[\s\S]*translate3d\(-12px, 0, 0\)[\s\S]*translate3d\(12px, 0, 0\)/);
  });

  it("uses the requested smaller language-switcher type", () => {
    const switcherRules = shellStyles.match(/\.redesign-language-link\s*\{([^}]*)\}/)?.[1];

    expect(switcherRules).toMatch(/font-size:\s*10px/);
  });
});
