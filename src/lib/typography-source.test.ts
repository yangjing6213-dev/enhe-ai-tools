import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const projectRoot = join(__dirname, "..", "..");
const cssPath = join(projectRoot, "src", "app", "globals.css");
const rootLayoutPath = join(projectRoot, "src", "app", "root-layout-shared.tsx");
const publicFontsPath = join(projectRoot, "public", "fonts");

describe("ENHE typography source contract", () => {
  it("serves the unmodified official MiSans Latin faces and full license", () => {
    const fontDir = join(publicFontsPath, "misans-latin");
    const manifest = JSON.parse(readFileSync(join(fontDir, "manifest.json"), "utf8"));
    expect(manifest.modified).toBe(false);
    expect(manifest.assets.map((asset: { weight: number }) => asset.weight)).toEqual([330, 520, 630]);
    for (const asset of manifest.assets) {
      const bytes = readFileSync(join(fontDir, asset.file));
      expect(bytes.length).toBe(asset.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    }
    const license = readFileSync(join(fontDir, "LICENSE.pdf"));
    expect(createHash("sha256").update(license).digest("hex")).toBe("4a93a27cd2bd81b3b5ecfd0a853144a876fa26938a93a68443c67d74172fcb86");
  });
  it("embeds the unchanged official OPPO variable font with its bundled license", () => {
    const fontDir = join(publicFontsPath, "oppo-sans-4");
    const manifest = JSON.parse(readFileSync(join(fontDir, "manifest.json"), "utf8"));
    const bytes = readFileSync(join(fontDir, manifest.file));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("4f58dbaeaea78ebe9dafaadd2bec60f50983ef15de31605beff55aac94420dd2");
    expect(bytes.length).toBe(22775460);
    expect(manifest.modified).toBe(false);
    expect(readFileSync(join(fontDir, "LICENSE.txt"), "utf8")).toContain("embed, bundle, redistribute");
    expect(readFileSync(cssPath, "utf8")).toContain("font-weight: 100 700;");
    expect(readFileSync(join(projectRoot, "src/app/about/page-shell.tsx"), "utf8")).toContain("This site uses OPPO Sans and MiSans fonts.");
  });
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

  it("sets the approved OPPO Chinese and MiSans English UI families", () => {
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
    expect(css).toContain("--font-sans: 'OPPO Sans 4.0', 'Microsoft YaHei', Arial, sans-serif");
    expect(css).toContain("--font-heading-zh: 'OPPO Sans 4.0', 'Microsoft YaHei', Arial, sans-serif");
    expect(css).toContain("font-family: var(--font-sans)");
    expect(css).not.toContain("fonts.googleapis.com");
  });

  it("uses the language-specific family for ordinary headings", () => {
    const css = readFileSync(cssPath, "utf8");

    expect(css).toContain("html[lang='zh-CN'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-zh)");
    expect(css).toContain("html[lang='en-US'] :is(h1, h2, h3, .home-hero-title)");
    expect(css).toContain("font-family: var(--font-heading-en)");
    expect(css).toContain("--font-heading-en: 'MiSans'");
  });

  it("does not preload unused Montserrat 800 and 900 font files in the shared document head", () => {
    const rootLayout = readFileSync(rootLayoutPath, "utf8");

    expect(rootLayout).not.toContain("montserrat-latin-800-normal.woff2");
    expect(rootLayout).not.toContain("montserrat-latin-900-normal.woff2");
  });
});
