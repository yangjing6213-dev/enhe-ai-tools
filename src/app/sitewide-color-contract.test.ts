import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("sitewide white and black color contract", () => {
  it("keeps page and card surfaces white with black neutral text", () => {
    const css = read("src/app/globals.css");
    const rootTokens = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
    const whiteSurfaceTokens = [
      "marketing-bg",
      "marketing-bg-soft",
      "marketing-bg-warm",
      "marketing-card",
      "marketing-card-soft",
      "background",
      "background-deep",
      "background-soft",
      "card",
      "card-strong",
      "card-soft",
      "popover",
      "sidebar",
      "muted",
    ];
    const blackTextTokens = [
      "marketing-text",
      "marketing-muted",
      "marketing-soft-text",
      "card-foreground",
      "foreground",
      "foreground-soft",
      "muted-foreground",
      "dim",
      "primary-foreground",
      "popover-foreground",
      "sidebar-foreground",
    ];

    for (const token of whiteSurfaceTokens) {
      expect(rootTokens, `--${token}`).toMatch(new RegExp(`--${token}:\\s*#ffffff\\s*;`, "i"));
    }
    for (const token of blackTextTokens) {
      expect(rootTokens, `--${token}`).toMatch(new RegExp(`--${token}:\\s*#000000\\s*;`, "i"));
    }

    const tokens = read("src/styles/redesign/tokens.css");
    expect(tokens).toMatch(/--enhe-footer:\s*#ffffff\s*;/i);
    expect(css).toContain("/* Sitewide fixed-light color contract */");
    expect(css).toMatch(/body :is\(\s*main,\s*section,\s*article/);
    expect(css).toContain('[class*="Card"]');
    expect(css).toContain('body :is([role="dialog"], [role="menu"], [role="listbox"])');
    expect(css).toContain('[class*="text-white"]');
    expect(css).toContain('[class*="text-gray-"]');
    expect(css).toContain('[class*="text-[#d8f8ff]"]');
    expect(css).toContain('[class*="bg-gray-"]');
    expect(css).toContain('[class*="bg-[#07101E]"]');

    const asciiText = read("src/components/home/ascii-text.module.css");
    expect(asciiText).toContain("color: #000000;");

    expect(css).toMatch(/\.home-page-shell\s*\{[^}]*background:\s*#ffffff/i);
    expect(css).toMatch(/\.home-hero-shell\s*\{[^}]*background:\s*#ffffff/i);
    expect(css).toMatch(/\.home-hero-liquid-overlay\s*\{[^}]*background:\s*none/i);
    expect(css).toMatch(/\.home-hero-liquid-vignette\s*\{[^}]*background:\s*none/i);
  });

  it("does not enable system dark mode or expose an ineffective theme switch", () => {
    const provider = read("src/components/site-theme-provider.tsx");
    expect(provider).toContain('defaultTheme="light"');
    expect(provider).toContain('forcedTheme="light"');
    expect(provider).toContain("enableSystem={false}");

    for (const path of [
      "src/components/site-header.tsx",
      "src/components/redesign/enhe-redesign-header.tsx",
      "src/components/redesign/enhe-redesign-mobile-menu.tsx",
      "src/app/admin/layout.tsx",
    ]) {
      expect(read(path), path).not.toContain("ThemeToggle");
    }
  });
});
