import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";
import { SOFTWARE_CATEGORIES } from "@/lib/redesign/software/software-categories";
import {
  FEATURED_PRODUCT_IDS,
  NEW_RELEASE_IDS,
  SOFTWARE_PRODUCTS,
} from "@/lib/redesign/software/software-products";

const srcRoot = join(process.cwd(), "src");

function readCandidate(relativePath: string) {
  const path = join(srcRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("AI tools candidate catalog", () => {
  it("uses the locale helper, server html locale header, and noindex preview metadata", () => {
    const page = readCandidate("app/redesign-preview/software/page.tsx");
    const layout = readCandidate("app/redesign-preview/software/layout.tsx");

    expect(page).toContain("resolveRedesignPreviewLocale");
    expect(page).toContain("x-enhe-locale");
    expect(page).toContain("EnheRedesignHeader");
    expect(page).toContain("EnheRedesignFooter");
    expect(page).toContain("/redesign-preview/software?locale=en");
    expect(page).toContain("/redesign-preview/software?locale=zh");
    expect(layout).toContain("@/styles/redesign/tokens.css");
    expect(layout).toContain("@/styles/redesign/shell.css");
    expect(layout).toContain("@/styles/redesign/software.css");
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
    expect(layout).toContain("noarchive: true");
    expect(layout).toContain("noimageindex: true");
    expect(layout).toContain("x-enhe-html-locale");
    expect(layout).toMatch(/<html\s+lang=\{/);
    expect(page).not.toContain("document.documentElement.lang");
  });

  it("normalizes locale query requests before server render so html lang can follow the same effective locale", () => {
    const redirectResponse = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/redesign-preview/software?locale=en", {
        headers: { cookie: "enhe_locale=zh" },
      }),
    );

    expect(redirectResponse.status).toBe(308);
    expect(redirectResponse.headers.get("location")).toBe(
      "https://www.enhe-tech.com.cn/redesign-preview/software",
    );
    expect(redirectResponse.cookies.get("enhe_locale")?.value).toBe("en");

    const renderResponse = middleware(
      new NextRequest("https://www.enhe-tech.com.cn/redesign-preview/software", {
        headers: { cookie: "enhe_locale=en" },
      }),
    );

    expect(renderResponse.headers.get("x-middleware-request-x-enhe-html-locale")).toBe("en");
    expect(renderResponse.headers.get("x-middleware-request-x-enhe-locale")).toBe("en");
  });

  it("keeps one H1, three ordered sections, and the exact 4/3/12 section contract", () => {
    const catalog = readCandidate("components/redesign/software/EnheRedesignSoftwareCatalog.tsx");

    const sectionOrder = [
      'data-section="new-releases"',
      'data-section="featured-products"',
      'data-section="all-products"',
    ] as const;

    let lastIndex = -1;
    for (const marker of sectionOrder) {
      const nextIndex = catalog.indexOf(marker);
      expect(nextIndex, `missing or misordered marker: ${marker}`).toBeGreaterThan(lastIndex);
      lastIndex = nextIndex;
    }

    expect(catalog.match(/<h1/g)?.length ?? 0).toBe(1);
    expect(catalog).toContain("NEW_RELEASE_IDS");
    expect(catalog).toContain("FEATURED_PRODUCT_IDS");
    expect(catalog).toContain("SOFTWARE_PRODUCTS");
    expect(NEW_RELEASE_IDS).toHaveLength(4);
    expect(FEATURED_PRODUCT_IDS).toHaveLength(3);
    expect(SOFTWARE_PRODUCTS).toHaveLength(12);
  });

  it("renders the frozen bilingual product links without production mutations or external media fields", () => {
    const card = readCandidate("components/redesign/software/EnheRedesignSoftwareCard.tsx");

    expect(SOFTWARE_PRODUCTS.every((product) => product.detailHref.zh.startsWith("/"))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => product.detailHref.en.startsWith("/en/"))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => !/^https?:/i.test(product.detailHref.zh))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => !/^https?:/i.test(product.detailHref.en))).toBe(true);
    expect(card).toContain("<article");
    expect(card).toContain("detailHref");
    expect(card).toContain("alt=");
    expect(card).toContain("onError");
    expect(card).not.toMatch(/File\.file(?:Url|Path)|rating|delivery|download|orders|payment|OAuth|fetch\(/i);
  });

  it("defines all seven categories with the documented keyboard traversal and shared visibility event", () => {
    const selector = readCandidate(
      "components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
    );
    const loadMore = readCandidate(
      "components/redesign/software/EnheRedesignSoftwareLoadMore.tsx",
    );

    expect(SOFTWARE_CATEGORIES).toHaveLength(7);
    expect(selector).toContain("SOFTWARE_CATEGORIES");
    expect(selector).toContain("aria-pressed");
    expect(selector).toContain("data-selected-category");
    expect(selector).toContain("ArrowUp");
    expect(selector).toContain("ArrowDown");
    expect(selector).toMatch(/focus\(\)/);
    expect(selector).toContain("software-catalog:visibility-change");
    expect(loadMore).toMatch(/SOFTWARE_CATALOG_VISIBILITY_EVENT|software-catalog:visibility-change/);
  });

  it("keeps three all-product cards hidden at first and preserves the crawlable page-two link", () => {
    const catalog = readCandidate("components/redesign/software/EnheRedesignSoftwareCatalog.tsx");
    const selector = readCandidate(
      "components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
    );
    const loadMore = readCandidate("components/redesign/software/EnheRedesignSoftwareLoadMore.tsx");
    const selectorImportBlock = catalog.match(
      /import\s*\{([\s\S]*?)\}\s*from\s*"\.\/EnheRedesignSoftwareCategorySelector";/,
    )?.[1];

    expect(loadMore).toContain("data-load-more");
    expect(loadMore).toContain("data-loaded");
    expect(loadMore).toContain('"true"');
    expect(catalog).toContain("INITIAL_VISIBLE_ALL_PRODUCTS");
    expect(catalog).toContain("const INITIAL_VISIBLE_ALL_PRODUCTS = 9;");
    expect(catalog).toContain("index >= INITIAL_VISIBLE_ALL_PRODUCTS");
    expect(selectorImportBlock).toContain("EnheRedesignSoftwareCategorySelector");
    expect(selectorImportBlock).not.toContain("INITIAL_VISIBLE_ALL_PRODUCTS");
    expect(selector).not.toContain("export const INITIAL_VISIBLE_ALL_PRODUCTS");
    expect(catalog).toContain('href="?page=2"');
    expect(catalog).toContain('rel="next"');
    expect(SOFTWARE_PRODUCTS.slice(9)).toHaveLength(3);
  });

  it("routes category changes and load-more through the shared visibility event after state is reflected", () => {
    const selector = readCandidate(
      "components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx",
    );
    const loadMore = readCandidate(
      "components/redesign/software/EnheRedesignSoftwareLoadMore.tsx",
    );

    const categoryChangePath = selector.match(
      /catalogRoot\.dataset\.selectedCategory = selectedCategory\.id;[\s\S]*?catalogRoot\.dispatchEvent\([\s\S]*?\);\s*\}, \[rootId, selectedCategory\.id\]\);/,
    )?.[0];
    const loadMoreClickPath = loadMore.match(
      /onClick=\{\(\) => \{[\s\S]*?catalogRoot\.dispatchEvent\([\s\S]*?\);\s*\}\}/,
    )?.[0];

    expect(categoryChangePath).toBeTruthy();
    expect(categoryChangePath).not.toContain("reconcileSoftwareCatalogVisibility");
    expect(loadMoreClickPath).toBeTruthy();
    expect(loadMoreClickPath).toMatch(/data-loaded/);
    expect(loadMoreClickPath).not.toContain("reconcileSoftwareCatalogVisibility");
    expect(loadMore).not.toContain("reconcileSoftwareCatalogVisibility");
  });
});
