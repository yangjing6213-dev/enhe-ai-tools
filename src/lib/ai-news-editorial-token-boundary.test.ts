import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("AI News editorial token boundary", () => {
  it("mounts the listing in a scoped root and loads its styles for both locales", () => {
    const page = read("app/ai-news/page-shell.tsx");
    const zhLayout = read("app/(zh-public)/layout.tsx");
    const enLayout = read("app/en/layout.tsx");

    expect(page).toContain(
      '<main className="ai-news-page ai-news-workspace enhe-reference-workspace">',
    );
    expect(zhLayout).toContain('@/styles/redesign/ai-news.css');
    expect(enLayout).toContain('@/styles/redesign/ai-news.css');
  });

  it("maps legacy marketing tokens and surfaces to the approved light system", () => {
    const styles = read("styles/redesign/ai-news.css");

    expect(styles).toMatch(/\.ai-news-page\s*\{[\s\S]*--marketing-bg:\s*var\(--enhe-page-bg\)/);
    expect(styles).toMatch(/\.ai-news-page\s*\{[\s\S]*--marketing-text:\s*var\(--enhe-text\)/);
    expect(styles).toContain('.enhe-redesign-production[lang="en"] .ai-news-page');
    expect(styles).toMatch(/\.ai-news-page\s+\.glass[^{]*\{[\s\S]*backdrop-filter:\s*none/);
    expect(styles).toMatch(/\.ai-news-page\s+\.surface-panel[^{]*\{[\s\S]*backdrop-filter:\s*none/);
    expect(styles).toContain(".ai-news-page .form-control-dark");
    expect(styles).toContain(".ai-news-page .form-select-dark");
  });

  it("keeps configured listing surfaces free of glow and white-alpha utilities", () => {
    const page = read("app/ai-news/page-shell.tsx");

    expect(page).not.toContain("radial-gradient");
    expect(page).not.toContain("border-white");
    expect(page).not.toContain("bg-white");
  });

  it("uses the locked focus ring and dark guard inside the AI News surface", () => {
    const styles = read("styles/redesign/ai-news.css");

    expect(styles).toMatch(
      /\.enhe-redesign-production \.ai-news-page\s+:is\([\s\S]*?a,[\s\S]*?button,[\s\S]*?summary,[\s\S]*?input,[\s\S]*?select,[\s\S]*?textarea[\s\S]*?\):focus-visible\s*\{[\s\S]*outline:\s*3px solid var\(--enhe-focus\);[\s\S]*outline-offset:\s*2px;[\s\S]*box-shadow:\s*0 0 0 7px var\(--enhe-text\);[\s\S]*z-index:\s*var\(--enhe-z-focus\)/,
    );
  });

  it("keeps claim-bearing summaries naturally wrapped across AI News surfaces", () => {
    const listing = read("app/ai-news/page-shell.tsx");
    const topic = read("app/ai-news/topics/[slug]/page-shell.tsx");
    const detail = read("app/ai-news/[slug]/page-shell.tsx");

    expect(listing).not.toContain("line-clamp");
    expect(topic).not.toContain("line-clamp");
    expect(detail).not.toContain("line-clamp");
    expect(listing).toContain("text-sm leading-7");
    expect(topic).toContain("text-sm leading-7");
    expect(detail).toContain("text-sm leading-6");
  });

  it("allows long unspaced claim text to break inside editorial cards", () => {
    const listing = read("app/ai-news/page-shell.tsx");
    const topic = read("app/ai-news/topics/[slug]/page-shell.tsx");
    const detail = read("app/ai-news/[slug]/page-shell.tsx");

    expect(listing).toContain(
      'className="mt-4 break-words text-xl font-black leading-snug',
    );
    expect(listing).toContain(
      'className="mt-3 break-words text-sm leading-7',
    );
    expect(topic).toContain(
      'className="mt-4 break-words text-lg font-black leading-snug',
    );
    expect(topic).toContain(
      'className="mt-3 break-words text-sm leading-7',
    );
    expect(detail).toContain(
      'className="mt-6 break-words max-w-5xl text-4xl font-black',
    );
    expect(detail).toContain(
      'className="mt-5 break-words max-w-3xl text-lg font-medium',
    );
    expect(detail).toContain(
      'className="mt-4 break-words text-base leading-8',
    );
    expect(detail).toContain(
      'className="break-words font-semibold text-[var(--marketing-text)]',
    );
    expect(detail).toContain(
      'className="mt-2 break-words text-sm leading-6',
    );
  });

  it("uses localized labels for the three supporting landmarks", () => {
    const dictionaries = read("lib/dictionaries.ts");
    const listing = read("app/ai-news/page-shell.tsx");
    const topic = read("app/ai-news/topics/[slug]/page-shell.tsx");
    const detail = read("app/ai-news/[slug]/page-shell.tsx");

    expect(dictionaries).toContain('discoveryRegionLabel: "AI资讯探索"');
    expect(dictionaries).toContain('discoveryRegionLabel: "AI news discovery"');
    expect(dictionaries).toContain('topicSupportLabel: "专题辅助链接"');
    expect(dictionaries).toContain('topicSupportLabel: "Topic support links"');
    expect(dictionaries).toContain('articleSupportLabel: "文章辅助链接"');
    expect(dictionaries).toContain('articleSupportLabel: "Article support links"');

    expect(listing).toContain('aria-label={t.aiNews.discoveryRegionLabel}');
    expect(topic).toContain('aria-label={t.aiNews.topicSupportLabel}');
    expect(detail).toContain('aria-label={t.aiNews.articleSupportLabel}');
    expect(listing).not.toContain('aria-label="AI news filters"');
    expect(topic).not.toContain('aria-label="Topic support links"');
    expect(detail).not.toContain('aria-label="Article support links"');
  });

  it("names the filter form and discovery rail according to their contents", () => {
    const dictionaries = read("lib/dictionaries.ts");
    const listing = read("app/ai-news/page-shell.tsx");

    expect(dictionaries).toContain('filterFormLabel: "AI资讯筛选表单"');
    expect(dictionaries).toContain('filterFormLabel: "AI news filter form"');
    expect(dictionaries).toContain('discoveryRegionLabel: "AI资讯探索"');
    expect(dictionaries).toContain('discoveryRegionLabel: "AI news discovery"');
    expect(listing).toContain('aria-label={t.aiNews.filterFormLabel}');
    expect(listing).toContain('aria-label={t.aiNews.discoveryRegionLabel}');
    expect(listing).not.toContain(
      'aria-label={t.aiNews.filtersRegionLabel}',
    );
  });
});
