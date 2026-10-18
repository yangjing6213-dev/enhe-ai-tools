import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const projectRoot = join(__dirname, "..", "..");
const cssPath = join(projectRoot, "src", "app", "globals.css");
const rootLayoutPath = join(projectRoot, "src", "app", "root-layout-shared.tsx");
const publicFontsPath = join(projectRoot, "public", "fonts");

describe("ENHE typography source contract", () => {
  it("ships the complete approved OFL face with a verified immutable asset and preserved glyph evidence", () => {
    const fontDir = join(publicFontsPath, "enhe-rounded");
    const manifest = JSON.parse(readFileSync(join(fontDir, "manifest.json"), "utf8"));
    const bytes = readFileSync(join(fontDir, manifest.file));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.sha256);
    expect(manifest.sha256).toBe("bc07a6d90a6685fe2a824560788d8ddd70b89e269d462d64a713ddd93cbedfa1");
    expect(manifest.glyphCount).toBe(15865);
    expect(manifest.mappedCodePointCount).toBe(14304);
    expect(manifest.subsetApplied).toBe(false);
    expect(manifest.originalOutlinesSha256).toBe(manifest.convertedOutlinesSha256);
    expect(readFileSync(join(fontDir, "OFL.txt"), "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
    const css = readFileSync(cssPath, "utf8");
    expect(css).not.toContain("Alimama");
    expect(css).toMatch(/font-family: 'ENHE Rounded';[\s\S]*?font-weight: 400;/);
  });
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
    expect(css).toContain("font-family: 'ENHE Rounded'");
    expect(css).toContain("/fonts/enhe-rounded/ENHERounded-Regular-full-bc07a6d90a6685fe.woff2");
    const nextConfig = readFileSync(join(projectRoot, "next.config.ts"), "utf8");
    expect(nextConfig).toContain("public, max-age=31536000, immutable");
    expect(nextConfig).toContain("/fonts/enhe-rounded/ENHERounded-Regular-full-bc07a6d90a6685fe.woff2");
    expect(css).not.toContain('@import "../../public/fonts/misans/MiSans-Regular.min.css"');
    expect(css).not.toContain('@import "../../public/fonts/misans/MiSans-Semibold.min.css"');
    expect(css).not.toContain('@import "../../public/fonts/misans/MiSans-Bold.min.css"');
    expect(css).not.toContain("@import url('/fonts/misans/MiSans-Regular.min.css')");
    expect(css).not.toContain("@import url('/fonts/misans/MiSans-Bold.min.css')");
    expect(css).toContain("--font-sans: 'ENHE Rounded', 'Microsoft YaHei', Arial, sans-serif");
    expect(css).toContain("--font-heading-zh: 'ENHE Rounded', 'Microsoft YaHei', Arial, sans-serif");
    expect(css).toContain("font-family: var(--font-sans)");
    expect(css).not.toContain("fonts.googleapis.com");
  });

  it("keeps Chinese and English headings aligned to the same approved rounded family", () => {
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("html[lang='zh-CN'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-zh)");
    expect(css).toContain("html[lang='en-US'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-en)");
    expect(css).toContain("--font-heading-en: 'ENHE Rounded'");
  });

  it("does not preload unused Montserrat 800 and 900 font files in the shared document head", () => {
    const rootLayout = readFileSync(rootLayoutPath, "utf8");

    expect(rootLayout).not.toContain("montserrat-latin-800-normal.woff2");
    expect(rootLayout).not.toContain("montserrat-latin-900-normal.woff2");
  });
});
