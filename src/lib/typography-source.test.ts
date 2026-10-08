import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(__dirname, "..", "..");
const cssPath = join(projectRoot, "src", "app", "globals.css");
const rootLayoutPath = join(projectRoot, "src", "app", "root-layout-shared.tsx");
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

  it("sets the approved rounded font as the shared Chinese and English UI family", () => {
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("@font-face");
    expect(css).toContain("font-family: 'Alimama Fang Yuan Ti'");
    expect(css).toContain("/fonts/alimama/AlimamaFangYuanTiVF-Thin.woff2");
    expect(css).not.toContain('@import "../../public/fonts/misans/MiSans-Regular.min.css"');
    expect(css).not.toContain('@import "../../public/fonts/misans/MiSans-Semibold.min.css"');
    expect(css).not.toContain('@import "../../public/fonts/misans/MiSans-Bold.min.css"');
    expect(css).not.toContain("@import url('/fonts/misans/MiSans-Regular.min.css')");
    expect(css).not.toContain("@import url('/fonts/misans/MiSans-Bold.min.css')");
    expect(css).toContain("--font-sans: 'Alimama Fang Yuan Ti', 'Microsoft YaHei', Arial, sans-serif");
    expect(css).toContain("--font-heading-zh: 'Alimama Fang Yuan Ti', 'Microsoft YaHei', Arial, sans-serif");
    expect(css).toContain("font-family: var(--font-sans)");
    expect(css).not.toContain("fonts.googleapis.com");
  });

  it("keeps Chinese and English headings aligned to the same approved rounded family", () => {
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("html[lang='zh-CN'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-zh)");
    expect(css).toContain("html[lang='en-US'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-en)");
    expect(css).toContain("--font-heading-en: 'Alimama Fang Yuan Ti'");
  });

  it("does not preload unused Montserrat 800 and 900 font files in the shared document head", () => {
    const rootLayout = readFileSync(rootLayoutPath, "utf8");

    expect(rootLayout).not.toContain("montserrat-latin-800-normal.woff2");
    expect(rootLayout).not.toContain("montserrat-latin-900-normal.woff2");
  });
});
