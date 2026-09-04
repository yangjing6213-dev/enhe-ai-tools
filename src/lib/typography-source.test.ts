import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(__dirname, "..", "..");
const cssPath = join(projectRoot, "src", "app", "globals.css");
const publicFontsPath = join(projectRoot, "public", "fonts");

describe("ENHE typography source contract", () => {
  it("self-hosts Montserrat, MiSans, and Smiley Sans assets", () => {
    expect(existsSync(join(publicFontsPath, "montserrat", "montserrat-latin-400-normal.woff2"))).toBe(true);
    expect(existsSync(join(publicFontsPath, "montserrat", "montserrat-latin-700-normal.woff2"))).toBe(true);
    expect(existsSync(join(publicFontsPath, "smiley-sans", "SmileySans-Oblique.ttf.woff2"))).toBe(true);
    expect(existsSync(join(publicFontsPath, "misans", "MiSans-Regular.min.css"))).toBe(true);
    expect(existsSync(join(publicFontsPath, "misans", "MiSans-Semibold.min.css"))).toBe(true);
    expect(existsSync(join(publicFontsPath, "misans", "MiSans-Bold.min.css"))).toBe(true);
  });

  it("sets English to Montserrat and Chinese UI/body to Microsoft YaHei", () => {
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("@font-face");
    expect(css).toContain("font-family: 'Montserrat'");
    expect(css).toContain("/fonts/montserrat/montserrat-latin-800-normal.woff2");
    expect(css).toContain('@import "../../public/fonts/misans/MiSans-Regular.min.css"');
    expect(css).toContain('@import "../../public/fonts/misans/MiSans-Semibold.min.css"');
    expect(css).toContain('@import "../../public/fonts/misans/MiSans-Bold.min.css"');
    expect(css).not.toContain("@import url('/fonts/misans/MiSans-Regular.min.css')");
    expect(css).not.toContain("@import url('/fonts/misans/MiSans-Bold.min.css')");
    expect(css).toContain("--font-sans: 'Montserrat', 'Microsoft YaHei', 'Microsoft YaHei UI'");
    expect(css).toContain("--font-heading-zh: 'Montserrat', 'Microsoft YaHei', 'Microsoft YaHei UI'");
    expect(css).toContain("font-family: var(--font-sans)");
    expect(css).not.toContain("fonts.googleapis.com");
  });

  it("keeps Chinese and English headings aligned to the approved Montserrat / Microsoft YaHei stack", () => {
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("font-family: 'SmileySans'");
    expect(css).toContain("html[lang='zh-CN'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-zh)");
    expect(css).toContain("html[lang='en-US'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-en)");
  });
});
