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
    expect(css).toMatch(/\.dark\s*\{/);
    expect(css).toContain("--background: #ffffff");
    expect(css).toContain("--foreground: #000000");
    expect(css).toContain("--marketing-accent: var(--blue-11)");
    expect(css).toContain("--primary: var(--blue-9)");
    expect(css).toContain("--primary-foreground: #ffffff");
    expect(css).toContain("color-scheme: light");
    expect(css).toContain("color-scheme: dark");
  });

  it("keeps the shared site font on the approved OFL rounded font family", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

    expect(css).toContain("font-family: 'ENHE Rounded'");
    expect(css).toContain("--font-sans: 'ENHE Rounded'");
  });

  it("uses white text when legacy accent backgrounds are remapped to blue", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
    const ruleStart = css.indexOf(".bg-\\[\\#48F5D3\\],\n.bg-\\[\\#7DD3FC\\]");
    const ruleEnd = css.indexOf("\n}\n\n.has-", ruleStart);
    const remappedAccentRule = ruleStart >= 0 && ruleEnd > ruleStart ? css.slice(ruleStart, ruleEnd) : "";

    expect(remappedAccentRule).toContain("background: var(--marketing-accent) !important");
    expect(remappedAccentRule).toContain("color: #ffffff !important");
    expect(remappedAccentRule).not.toContain("color: #000000");
  });

  it("keeps the shared homepage blue call-to-action readable", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
    const buttonStart = css.indexOf(".home-final-cta-primary {");
    const hoverStart = css.indexOf(".home-final-cta-primary:hover {");
    const buttonRule = css.slice(buttonStart, css.indexOf("\n}", buttonStart));
    const hoverRule = css.slice(hoverStart, css.indexOf("\n}", hoverStart));

    expect(buttonRule).toContain("background: #0462C2 !important");
    expect(buttonRule).toContain("color: #ffffff !important");
    expect(hoverRule).toContain("background: #0D70D8 !important");
  });
});
