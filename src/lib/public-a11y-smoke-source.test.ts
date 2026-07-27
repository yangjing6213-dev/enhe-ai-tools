import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("public a11y smoke source contract", () => {
  it("ships a repeatable bilingual public-page accessibility smoke script", () => {
    const scriptPath = "scripts/audit-public-a11y.mjs";
    const script = read(scriptPath);
    const packageJson = read("package.json");

    expect(existsSync(join(root, scriptPath))).toBe(true);
    expect(packageJson).toContain('"audit:a11y"');
    expect(packageJson).toContain("node scripts/audit-public-a11y.mjs");
    expect(script).toContain("A11Y_AUDIT_BASE_URL");
    expect(script).toContain("axe-core/axe.min.js");
    expect(script).toContain('"/en"');
    expect(script).toContain('"/en/software"');
    expect(script).toContain('"/en/ai-news"');
    expect(script).toContain('"/en/ai-trends"');
    expect(script).toContain("/sitemap.xml");
    expect(script).toContain("moderateRegion");
    expect(script).toContain("landmark-complementary-is-top-level");
    expect(script).toContain("machineReadablePathPattern");
    expect(script).toContain("machineReadable");
    expect(script).toContain("trimText");
    expect(script).toContain("home-hero-velocity-copy");
    expect(script).toContain("canonical");
    expect(script).toContain("jsonLdTypes");
    expect(script).toContain('value["@graph"].flatMap(extractJsonLdTypes)');
    expect(script).toContain("bodyTextLength");
  });

  it("keeps empty states and prompt cards accessible", () => {
    const ui = read("src/components/ui.tsx");
    const promptWorkbench = read("src/components/ai-prompt-management-workbench.tsx");

    expect(ui).toContain('<h2 className="text-lg font-bold text-[var(--marketing-text)]">');
    expect(ui).not.toContain('<h3 className="text-lg font-bold text-[var(--marketing-text)]">');
    expect(promptWorkbench).toContain('text-xs font-black text-[#0f766e]');
  });

  it("keeps public page landmarks explicit without changing indexable content", () => {
    const tutorials = read("src/app/tutorials/page-shell.tsx");
    const newsDetail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(tutorials).toContain("<main>");
    expect(tutorials).toContain("<StructuredData");
    expect(tutorials).toContain('<SectionTitle as="h1"');
    expect(newsDetail).toContain("<main>");
    expect(newsDetail).toContain("<article>");
    expect(newsDetail).not.toContain('<main className="space-y-8">');
    expect(newsDetail).toContain('<div className="space-y-8">');
    expect(newsDetail).toContain("<StructuredData");
    expect(newsDetail).toContain("buildNewsArticleSchema");
    expect(newsDetail).toContain("buildFaqSchema");
  });

  it("keeps product-detail mobile hierarchy visual-only and SEO/GEO content intact", () => {
    const detail = read("src/app/tools/[slug]/page-shell.tsx");
    const css = read("src/app/globals.css");

    expect(detail).toContain("tool-detail-mobile-toc");
    expect(detail).toContain("tool-detail-mobile-disclosure");
    expect(detail).toContain("tool-detail-disclosure-summary");
    expect(detail).toContain("ToolRichContent content={localizedLongContent}");
    expect(detail).toContain("StructuredData");
    expect(detail).toContain("buildProductStructuredData");
    expect(detail).toContain("buildFaqSchema");
    expect(css).toContain(".tool-detail-mobile-toc");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".tool-detail-mobile-disclosure:not([open]) > .tool-detail-disclosure-body");
  });

  it("guards Core Web Vitals improvements for homepage and product videos", () => {
    const sharedLayout = read("src/app/root-layout-shared.tsx");
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const css = read("src/app/globals.css");
    const player = read("src/components/product-video-player.tsx");
    const a11yScript = read("scripts/audit-public-a11y.mjs");

    expect(sharedLayout).not.toContain("montserrat-latin-800-normal.woff2");
    expect(sharedLayout).not.toContain("montserrat-latin-900-normal.woff2");
    expect(toolDetail).toContain("priority");
    expect(toolDetail).toContain('fetchPriority="high"');
    expect(css).not.toContain(".home-featured-shell");
    expect(player).toContain('preload="none"');
    expect(player).toContain("IntersectionObserver");
    expect(player).toContain("video.src = src");
    expect(a11yScript).toContain("largest-contentful-paint");
    expect(a11yScript).toContain("layout-shift");
    expect(a11yScript).toContain("durationThreshold: 16");
  });
});
