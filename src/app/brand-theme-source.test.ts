import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("ENHE shared design tokens", () => {
  it("uses Radix blue accents with white surfaces and black text", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

    expect(css).toContain('@import "@radix-ui/colors/blue.css"');
    expect(css).toContain('@import "@radix-ui/colors/gray.css"');
    expect(css).not.toContain('@import "@radix-ui/colors/blue-dark.css"');
    expect(css).not.toContain('@import "@radix-ui/colors/gray-dark.css"');
    expect(css).not.toMatch(/\.dark\s*\{/);
    expect(css).toContain("--background: #ffffff");
    expect(css).toContain("--foreground: #000000");
    expect(css).toContain("--marketing-accent: var(--blue-11)");
    expect(css).toContain("--primary: var(--blue-9)");
    expect(css).toContain("--primary-foreground: #ffffff");
    expect(css).toContain("color-scheme: light");
  });

  it("keeps the shared site font on the supplied Alimama font family", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

    expect(css).toContain("font-family: 'Alimama Fang Yuan Ti'");
    expect(css).toContain("--font-sans: 'Alimama Fang Yuan Ti'");
  });
});
