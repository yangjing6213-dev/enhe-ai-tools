import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");
const globalStyles = readFileSync(join(sourceRoot, "app/globals.css"), "utf8");
const headerSource = readFileSync(join(sourceRoot, "components/site-header.tsx"), "utf8");
const footerSource = readFileSync(join(sourceRoot, "components/site-footer.tsx"), "utf8");

describe("public mascot decorations", () => {
  it("hangs the welcome tag from the AI trends navigation item", () => {
    expect(headerSource).toContain('buildLocalePath("/ai-trends", locale)');
    expect(headerSource).toContain('className="site-hanging-mascot"');
    expect(headerSource).toContain('src="/images/mascots/enhe-welcome-tag.webp"');
    expect(headerSource).toContain('aria-hidden="true"');
  });

  it("places the walking dino at the footer top as decoration", () => {
    expect(footerSource).toContain('className="site-footer-mascot"');
    expect(footerSource).toContain('src="/images/mascots/enhe-dino-mascot.webp"');
    expect(footerSource.indexOf('className="site-footer-mascot"')).toBeLessThan(
      footerSource.indexOf('<footer className="site-footer">'),
    );
  });

  it("keeps the header decoration desktop-only and respects reduced motion", () => {
    expect(globalStyles).toMatch(/@media\s*\(min-width:\s*1024px\)[\s\S]*?\.site-hanging-mascot/);
    expect(globalStyles).toContain("@keyframes enhe-hanging-tag-swing");
    expect(globalStyles).toContain("@keyframes enhe-footer-mascot-walk");
    expect(globalStyles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.site-hanging-mascot,\s*\.site-footer-mascot\s*\{\s*animation:\s*none/);
  });

  it("uses the requested smaller language-switcher type", () => {
    const switcherRules = globalStyles.match(/\.site-language-switcher a\s*\{([^}]*)\}/)?.[1];

    expect(switcherRules).toMatch(/font-size:\s*10px/);
  });
});
