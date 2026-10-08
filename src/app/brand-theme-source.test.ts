import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("ENHE shared design tokens", () => {
  it("uses Radix blue and gray scales for light and dark themes", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

    expect(css).toContain('@import "@radix-ui/colors/blue.css"');
    expect(css).toContain('@import "@radix-ui/colors/gray.css"');
    expect(css).toContain('@import "@radix-ui/colors/blue-dark.css"');
    expect(css).toContain('@import "@radix-ui/colors/gray-dark.css"');
    expect(css).toMatch(/\.dark\s*\{/);
    expect(css).toContain("--background: var(--gray-1)");
    expect(css).toContain("--marketing-accent: var(--blue-11)");
    expect(css).toContain("--primary: var(--blue-11)");
    expect(css).toContain("--primary-foreground: #ffffff");
    expect(css).toContain("color-scheme: inherit");
    const darkTheme = css.match(/\.dark\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(darkTheme).toContain("--primary: var(--blue-11)");
    expect(darkTheme).toContain("--primary-foreground: var(--gray-1)");
  });

  it("keeps the shared site font on the supplied Alimama font family", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

    expect(css).toContain("font-family: 'Alimama Fang Yuan Ti'");
    expect(css).toContain("--font-sans: 'Alimama Fang Yuan Ti'");
  });
});
