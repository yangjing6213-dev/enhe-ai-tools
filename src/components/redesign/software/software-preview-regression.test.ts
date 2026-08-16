import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import type { RedesignLocale } from "@/components/redesign/types";
import { middleware } from "@/middleware";
import { SOFTWARE_CATEGORIES } from "@/lib/redesign/software/software-categories";
import { SOFTWARE_COPY } from "@/lib/redesign/software/software-copy";
import { SOFTWARE_PRODUCTS } from "@/lib/redesign/software/software-products";

import { EnheRedesignSoftwarePreviewCatalog } from "./EnheRedesignSoftwarePreviewCatalog";

Object.assign(globalThis, { React });

const srcRoot = join(process.cwd(), "src");
const PREVIEW_ROUTE = "/redesign-preview/software";

function readCandidate(relativePath: string) {
  const path = join(srcRoot, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function renderCatalog(locale: RedesignLocale) {
  return renderToStaticMarkup(
    React.createElement(EnheRedesignSoftwarePreviewCatalog, { locale }),
  );
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

function escapeHtmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assertLocaleSurface(locale: RedesignLocale, html: string) {
  const otherLocale: RedesignLocale = locale === "en" ? "zh" : "en";
  const copy = SOFTWARE_COPY[locale];
  const otherCopy = SOFTWARE_COPY[otherLocale];

  expect(countMatches(html, /<h1>/g)).toBe(1);
  expect(html).toContain(copy.page.label);
  expect(html).toContain(copy.page.h1);
  expect(html).toContain(copy.page.intro);
  expect(html).toContain(copy.sections.newReleases.heading);
  expect(html).toContain(copy.sections.featuredProducts.heading);
  expect(html).toContain(copy.sections.allProducts.heading);
  expect(html).toContain(copy.actions.loadMore);
  expect(html).toContain(copy.actions.pageTwo);
  expect(html).toContain(copy.actions.detail);

  for (const product of SOFTWARE_PRODUCTS) {
    expect(html).toContain(product.name[locale]);
    expect(html).toContain(product.description[locale]);
    expect(html).toContain(product.price[locale]);
    expect(html).toContain(product.detailHref[locale]);

    if (product.description[locale] !== product.description[otherLocale]) {
      expect(html).not.toContain(product.description[otherLocale]);
    }

    if (product.price[locale] !== product.price[otherLocale]) {
      expect(html).not.toContain(product.price[otherLocale]);
    }
  }

  for (const value of [
    otherCopy.page.h1,
    otherCopy.sections.newReleases.heading,
    otherCopy.sections.featuredProducts.heading,
    otherCopy.sections.allProducts.heading,
    otherCopy.actions.loadMore,
    otherCopy.actions.pageTwo,
    otherCopy.actions.detail,
  ]) {
    if (!html.includes(value) && value !== copy.page.label) {
      continue;
    }

    if (value !== copy.page.label) {
      expect(html).not.toContain(value);
    }
  }
}

describe("AI tools candidate bilingual preview regression", () => {
  it("keeps the middleware-first locale normalization, candidate guard, and root-lang metadata contract", () => {
    const page = readCandidate("app/redesign-preview/software/page.tsx");
    const layout = readCandidate("app/redesign-preview/software/layout.tsx");

    for (const locale of ["en", "zh"] as const) {
      const redirectResponse = middleware(
        new NextRequest(`https://www.enhe-tech.com.cn${PREVIEW_ROUTE}?locale=${locale}`, {
          headers: { cookie: `enhe_locale=${locale === "en" ? "zh" : "en"}` },
        }),
      );

      expect(redirectResponse.status).toBe(308);
      expect(redirectResponse.headers.get("location")).toBe(
        `https://www.enhe-tech.com.cn${PREVIEW_ROUTE}`,
      );
      expect(redirectResponse.cookies.get("enhe_locale")?.value).toBe(locale);

      const renderResponse = middleware(
        new NextRequest(`https://www.enhe-tech.com.cn${PREVIEW_ROUTE}`, {
          headers: { cookie: `enhe_locale=${locale}` },
        }),
      );

      expect(renderResponse.headers.get("x-middleware-request-x-enhe-html-locale")).toBe(locale);
      expect(renderResponse.headers.get("x-middleware-request-x-enhe-locale")).toBe(locale);
    }

    expect(page).toContain('process.env.NODE_ENV === "production"');
    expect(page).toContain("notFound()");
    expect(page).toContain("resolveRedesignPreviewLocale");
    expect(page).toContain("x-enhe-locale");
    expect(page).toContain("<EnheRedesignHeader");
    expect(page).toContain("<EnheRedesignSoftwarePreviewCatalog locale={locale} />");
    expect(page).toContain("<EnheRedesignFooter locale={locale} />");
    expect(page).toContain(`${PREVIEW_ROUTE}?locale=en`);
    expect(page).toContain(`${PREVIEW_ROUTE}?locale=zh`);
    expect(page).not.toContain("document.documentElement.lang");

    expect(layout).toContain("@/styles/redesign/tokens.css");
    expect(layout).toContain("@/styles/redesign/shell.css");
    expect(layout).toContain("@/styles/redesign/software.css");
    expect(layout).toContain("index: false");
    expect(layout).toContain("follow: false");
    expect(layout).toContain("noarchive: true");
    expect(layout).toContain("noimageindex: true");
    expect(layout).toContain("x-enhe-html-locale");
    expect(layout).toMatch(/<html\s+lang=\{/);
  });

  it("renders both locales with one H1, localized catalog copy, product content, and footer-bound locale propagation", () => {
    const page = readCandidate("app/redesign-preview/software/page.tsx");

    expect(page).toContain("<EnheRedesignHeader");
    expect(page).toContain("<EnheRedesignFooter locale={locale} />");

    assertLocaleSurface("zh", renderCatalog("zh"));
    assertLocaleSurface("en", renderCatalog("en"));
  });

  it("keeps the exact 4/3/12 section contract, seven categories, 9 initial plus 3 hidden cards, and page-two pagination", () => {
    const zhHtml = renderCatalog("zh");
    const enHtml = renderCatalog("en");
  const allProductsHtml = enHtml.slice(enHtml.indexOf('data-section="all-products"'));
    const selector = readCandidate("components/redesign/software/EnheRedesignSoftwareCategorySelector.tsx");
    const loadMore = readCandidate("components/redesign/software/EnheRedesignSoftwareLoadMore.tsx");

    expect(countMatches(enHtml, /data-catalog-card="true" data-category="[^"]+" data-section="new-releases"/g)).toBe(4);
    expect(countMatches(enHtml, /data-catalog-card="true" data-category="[^"]+" data-section="featured-products"/g)).toBe(3);
    expect(countMatches(enHtml, /data-catalog-card="true" data-category="[^"]+" data-section="all-products"/g)).toBe(12);
    expect(countMatches(allProductsHtml, /data-extra-card="true"/g)).toBe(3);
    expect(countMatches(allProductsHtml, /hidden=""/g)).toBe(3);

    expect(countMatches(enHtml, /class="redesign-software-category-button"/g)).toBe(7);
    expect(countMatches(zhHtml, /class="redesign-software-category-button"/g)).toBe(7);
    expect(SOFTWARE_CATEGORIES).toHaveLength(7);

    for (const category of SOFTWARE_CATEGORIES) {
      expect(enHtml).toContain(escapeHtmlText(category.label.en));
      expect(zhHtml).toContain(escapeHtmlText(category.label.zh));
    }

    expect(enHtml).toContain('href="?page=2"');
    expect(enHtml).toContain('rel="next"');
    expect(enHtml).toContain('data-load-more="true"');
    expect(enHtml).toContain('data-loaded="false"');
    expect(enHtml).toContain("Showing 9 of 12 products.");
    expect(zhHtml).toContain("9 / 12");

    expect(selector).toContain("SOFTWARE_CATALOG_VISIBILITY_EVENT");
    expect(selector).toContain("reconcileSoftwareCatalogVisibility");
    expect(selector).toContain("data-selected-category");
    expect(loadMore).toContain('allProductsRoot.dataset.loaded = "true"');
    expect(loadMore).toContain('allProductsRoot.setAttribute("data-loaded", "true")');
    expect(loadMore).toContain("SOFTWARE_CATALOG_VISIBILITY_EVENT");
  });

  it("keeps relative bilingual detail paths, local media or text fallback only, and no forbidden product claims", () => {
    const html = renderCatalog("en");
    const card = readCandidate("components/redesign/software/EnheRedesignSoftwareCard.tsx");
    const preloadHrefs = [...html.matchAll(/<link[^>]*rel="preload"[^>]*href="([^"]+)"/g)].map(
      ([, href]) => href,
    );
    const imageSources = [...html.matchAll(/<img[^>]*src="([^"]+)"/g)].map(([, src]) => src);
    const resolvedImageSources = imageSources.map((src) => {
      const normalized = src.replaceAll("&amp;", "&");
      return normalized.startsWith("/_next/image?")
        ? new URL(normalized, "https://www.enhe-tech.com.cn").searchParams.get("url") ?? ""
        : normalized;
    });
    const expectedMediaSources = [
      ...new Set(
        SOFTWARE_PRODUCTS.flatMap((product) => (product.media ? [product.media.src] : [])),
      ),
    ].sort();
    const forbiddenClaimsPattern =
      /\bhttps?:\/\/\b|File\.file(?:Url|Path)|\bratings?\b|\bdelivery\b|\bdownloads?\b|\borders?\b|\bpayments?\b|\bOAuth\b/i;

    expect(card).toContain("redesign-software-card-cover");
    expect(card).toContain("onError");
    expect(card).not.toMatch(/File\.file(?:Url|Path)|rating|delivery|download|orders|payment|OAuth|fetch\(/i);

    expect(SOFTWARE_PRODUCTS.every((product) => product.detailHref.zh.startsWith("/"))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => product.detailHref.en.startsWith("/en/"))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => !/^https?:/i.test(product.detailHref.zh))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => !/^https?:/i.test(product.detailHref.en))).toBe(true);

    expect(preloadHrefs).toEqual([]);
    expect([...new Set(resolvedImageSources)].sort()).toEqual(expectedMediaSources);
    expect(resolvedImageSources.every((value) => value.startsWith("/"))).toBe(true);
    expect(html).not.toMatch(forbiddenClaimsPattern);
  });

  it("keeps the responsive rail-only markers, 4/3/2/1/1 grid breakpoints, and mobile one-column all-products contract", () => {
    const css = readCandidate("styles/redesign/software.css");
    const catalog = readCandidate("components/redesign/software/EnheRedesignSoftwareCatalog.tsx");

    expect(css).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)[\s\S]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)[\s\S]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media\s*\(width\s*<\s*768px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(css).toContain("gap: 18px");
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("margin-inline: calc(50% - 50vw)");
    expect(css).toContain("flex: 0 0 80vw");
    expect(css).toContain("flex: 0 0 84vw");
    expect(css).toContain("scroll-padding-inline");
    expect(css).toContain("min-width: 0");

    expect(catalog).toContain('rail="new"');
    expect(catalog).toContain('rail="featured"');
    expect(catalog).not.toContain('rail="all"');
  });

  it("keeps the preview isolated from sitemap, robots, and public navigation surfaces", () => {
    const sitemap = readCandidate("app/sitemap.ts");
    const robots = readCandidate("app/robots.ts");
    const navigation = readCandidate("components/redesign/navigation.ts");

    expect(sitemap).not.toContain("redesign-preview/software");
    expect(robots).not.toContain("redesign-preview/software");
    expect(navigation).not.toContain("redesign-preview/software");
    expect(navigation).not.toContain(`${PREVIEW_ROUTE}?locale=en`);
    expect(navigation).not.toContain(`${PREVIEW_ROUTE}?locale=zh`);
  });
});
