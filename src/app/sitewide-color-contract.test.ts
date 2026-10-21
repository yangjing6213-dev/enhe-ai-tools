import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("sitewide color mode contract", () => {
  it("keeps the existing light palette and restores the dark palette when selected", () => {
    const css = read("src/app/globals.css");
    const rootTokens = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
    const darkTokens = css.match(/\.dark\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(rootTokens).toContain("--background: #ffffff;");
    expect(rootTokens).toContain("--foreground: #000000;");
    expect(darkTokens).toContain("color-scheme: dark;");
    expect(darkTokens).toContain("--background: #0b1220;");
    expect(darkTokens).toContain("--foreground: #f6faff;");
    expect(css).toContain("/* Preserve the established light appearance without overriding dark mode. */");
    expect(css).toContain("html:not(.dark) body");
    expect(css).toContain("html:not(.dark) body :is(");
    expect(css).not.toContain("\nbody {\n  background: #ffffff !important;");
    expect(css).toContain('[class*="Card"]');
    expect(css).toContain('[class*="text-white"]');

    const asciiText = read("src/components/home/ascii-text.module.css");
    expect(asciiText).toContain("color: #000000;");
  });

  it("defaults to the operating system and exposes the theme menu after language selection", () => {
    const provider = read("src/components/site-theme-provider.tsx");
    expect(provider).toContain('defaultTheme="system"');
    expect(provider).not.toContain("forcedTheme=");
    expect(provider).toContain("enableSystem");

    const header = read("src/components/redesign/enhe-redesign-header.tsx");
    expect(header).toContain("EnheRedesignThemeSwitch");
    expect(header.indexOf("<EnheRedesignLanguageSwitch")).toBeLessThan(
      header.indexOf("<EnheRedesignThemeSwitch"),
    );
  });
});
