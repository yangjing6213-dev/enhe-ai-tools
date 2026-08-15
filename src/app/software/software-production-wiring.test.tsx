import { readFileSync } from "node:fs";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EnheRedesignSoftwareCatalog } from "@/components/redesign/software/EnheRedesignSoftwareCatalog";
import type { SoftwareCatalogPage } from "@/lib/redesign/software/software-production";

Object.assign(globalThis, { React });

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8").replace(/\r\n/g, "\n");
}

describe("production software route wiring", () => {
  it("wires both formal routes to the redesigned server catalog and keeps the preview fixture isolated", () => {
    const shell = readSource("./page-shell.tsx");
    const zhRoute = readSource("../(zh-public)/software/page.tsx");
    const enRoute = readSource("../en/software/page.tsx");
    const preview = readSource("../redesign-preview/software/page.tsx");
    const catalog = readSource(
      "../../components/redesign/software/EnheRedesignSoftwareCatalog.tsx",
    );
    const previewCatalog = readSource(
      "../../components/redesign/software/EnheRedesignSoftwarePreviewCatalog.tsx",
    );

    expect(shell).toContain("EnheRedesignSoftwareCatalog");
    expect(shell).toContain("getProductionSoftwareCatalog");
    expect(shell).not.toContain("SOFTWARE_PRODUCTS");
    expect(catalog).not.toContain("SOFTWARE_PRODUCTS");
    expect(catalog).not.toContain("NEW_RELEASE_IDS");
    expect(catalog).not.toContain("FEATURED_PRODUCT_IDS");
    expect(shell).not.toMatch(/Candidate|LOCAL CANDIDATE|Preview/);
    expect(zhRoute).toContain("PublicSiteChrome");
    expect(zhRoute).toContain('forceLocale="zh"');
    expect(enRoute).toContain("PublicSiteChrome");
    expect(enRoute).toContain('forceLocale="en"');
    expect(preview).toContain("EnheRedesignSoftwarePreviewCatalog");
    expect(previewCatalog).toContain("SOFTWARE_PRODUCTS");
    expect(preview).toContain("LOCAL CANDIDATE");
  });

  it("uses next/image with explicit dimensions and a failure fallback in the shared card", () => {
    const card = readSource("../../components/redesign/software/EnheRedesignSoftwareCard.tsx");

    expect(card).toContain('from "next/image"');
    expect(card).toContain("<Image");
    expect(card).not.toContain("<img");
    expect(card).toContain("width=");
    expect(card).toContain("height=");
    expect(card).toContain("alt=");
    expect(card).toContain("onError");
  });

  it("keeps production pagination server-rendered with no hidden 9-plus-3 branch", () => {
    const catalog = readSource(
      "../../components/redesign/software/EnheRedesignSoftwareCatalog.tsx",
    );
    const productionBranch = catalog.match(
      /function renderProductionCatalog[\s\S]*?\n}\n\nfunction CatalogSection/,
    )?.[0] ?? "";

    expect(productionBranch).toContain("listing.items.map");
    expect(productionBranch).toContain('rel="next"');
    expect(productionBranch).toContain('rel="prev"');
    expect(productionBranch).not.toContain("INITIAL_VISIBLE_ALL_PRODUCTS");
    expect(productionBranch).not.toContain("extraHidden");
    expect(productionBranch).not.toContain("hidden=");
  });

  it("server-renders one H1 and the initial public product semantics without candidate or delivery text", () => {
    const item = {
      id: "public-tool",
      categoryId: "video" as const,
      name: "Public AI Video Tool",
      description: "Creates a practical video draft from approved source material.",
      price: "¥19.00",
      detailHref: "/en/software/public-ai-video-tool",
      media: null,
    };
    const listing: SoftwareCatalogPage = {
      items: [item],
      newReleases: [item],
      featuredProducts: [item],
      total: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
      previousHref: null,
      nextHref: null,
    };
    const html = renderToStaticMarkup(
      React.createElement(EnheRedesignSoftwareCatalog, {
        locale: "en",
        mode: "production",
        listing,
      }),
    );

    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain("data-production-catalog");
    expect(html).toContain("Public AI Video Tool");
    expect(html).toContain('href="/en/software/public-ai-video-tool"');
    expect(html).not.toMatch(/<article[^>]*hidden/i);
    expect(html).not.toMatch(/LOCAL CANDIDATE|Preview|fileUrl|filePath|delivery/i);
  });

  it("builds page-aware canonicals and noindex-follow category metadata", async () => {
    const { generateSoftwarePageMetadata } = await import("./page-shell");
    const first = await generateSoftwarePageMetadata("zh", Promise.resolve({}));
    const second = await generateSoftwarePageMetadata(
      "zh",
      Promise.resolve({ page: "2" }),
    );
    const englishSecond = await generateSoftwarePageMetadata(
      "en",
      Promise.resolve({ page: "2" }),
    );
    const category = await generateSoftwarePageMetadata(
      "zh",
      Promise.resolve({ category: "video" }),
    );
    const allCategory = await generateSoftwarePageMetadata(
      "zh",
      Promise.resolve({ category: "all" }),
    );

    expect(String(first.alternates?.canonical)).toMatch(/\/software$/);
    expect(String(second.alternates?.canonical)).toMatch(/\/software\?page=2$/);
    expect(String(englishSecond.alternates?.canonical)).toMatch(/\/en\/software\?page=2$/);
    expect(String(category.alternates?.canonical)).toMatch(/\/software$/);
    expect(category.robots).toMatchObject({ index: false, follow: true });
    expect(allCategory.robots).toMatchObject({ index: false, follow: true });
    expect(second.alternates?.languages).toHaveProperty("zh-CN");
    expect(second.alternates?.languages).not.toHaveProperty("en-US");
    expect(englishSecond.alternates?.languages).toHaveProperty("en-US");
    expect(englishSecond.alternates?.languages).not.toHaveProperty("zh-CN");
  });
});
