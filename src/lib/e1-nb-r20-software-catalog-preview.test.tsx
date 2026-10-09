import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: db.toolFindMany,
    },
  },
}));

describe("E1-NB-R20 software catalog DB-free preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
  });

  it("returns no software rows without querying Prisma when DATABASE_URL is unset", async () => {
    db.toolFindMany.mockResolvedValue([]);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).resolves.toEqual([]);
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });

  it.each(["zh", "en"] as const)(
    "renders a safe DB-free software preview (%s)",
    async (locale) => {
      db.toolFindMany.mockResolvedValue([]);
      const { generateSoftwarePageMetadata, SoftwarePageShell } = await import(
        "@/app/software/page-shell"
      );

      const html = renderToStaticMarkup(
        await SoftwarePageShell({
          searchParams: Promise.resolve({}),
          forceLocale: locale,
        }),
      );
      const metadata = await generateSoftwarePageMetadata(
        locale,
        Promise.resolve({}),
      );

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).not.toContain("data-production-catalog");
      expect(html).not.toContain("data-all-products-root");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("CollectionPage");
      expect(html).not.toContain("ItemList");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(db.toolFindMany).not.toHaveBeenCalled();

      if (locale === "en") {
        expect(html).toContain("Software catalog content has not been verified yet");
        expect(metadata.description).toContain(
          "Software catalog content is not available in this local preview.",
        );
        expect(html).not.toMatch(/[\u3400-\u9fff]/);
      } else {
        expect(html).toContain("软件目录内容尚未核验");
      }
    },
    10000,
  );

  it.each([
    ["zh", undefined, "暂时没有已公开产品。"],
    ["en", undefined, "No published products are available yet."],
    ["zh", "efficiency", "该分类暂时没有已公开产品。"],
    ["en", "efficiency", "No published products are available in this category yet."],
  ] as const)(
    "keeps the %s empty-state message outside the semantic product list",
    async (locale, category, expectedMessage) => {
      process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
      const { SoftwarePageShell } = await import("@/app/software/page-shell");
      const html = renderToStaticMarkup(
        await SoftwarePageShell({
          searchParams: Promise.resolve(category ? { category } : {}),
          forceLocale: locale,
          preloadedListing: {
            items: [],
            newReleases: [],
            featuredProducts: [],
            total: 0,
            page: 1,
            pageSize: 12,
            totalPages: 1,
            hasPrevious: false,
            hasNext: false,
            previousHref: null,
            nextHref: null,
          } as never,
        }),
      );
      const listStart = html.indexOf("data-all-products-root");
      const listClose = html.indexOf("</div>", listStart);
      const status = html.indexOf('role="status"', listStart);

      expect(listStart).toBeGreaterThanOrEqual(0);
      expect(listClose).toBeGreaterThan(listStart);
      expect(status).toBeGreaterThan(listClose);
      expect(html.match(/role="status"/g) ?? []).toHaveLength(1);
      expect(html).toContain(expectedMessage);
    },
  );

  it("preserves configured catalog rendering and indexable metadata", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    const item = {
      id: "verified-software",
      type: "software", secondaryName: null, isPaid: false, highlights: ["Software app", "Free trial", "Clear access"], downloadCount: 0, usageCount: 0,
      categoryId: "efficiency",
      name: "Verified Software",
      description: "A verified catalog listing.",
      price: "Free",
      detailHref: "/en/software/verified-software",
      media: null,
    };
    const listing = {
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
    const { generateSoftwarePageMetadata, SoftwarePageShell } = await import(
      "@/app/software/page-shell"
    );

    const html = renderToStaticMarkup(
      await SoftwarePageShell({
        searchParams: Promise.resolve({}),
        forceLocale: "en",
        preloadedListing: listing as never,
      }),
    );
    const metadata = await generateSoftwarePageMetadata(
      "en",
      Promise.resolve({}),
    );

    expect(html).toContain("Verified Software");
    expect(html).toContain("data-production-catalog");
    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();
  });

  it("preserves configured public software reads", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    db.toolFindMany.mockResolvedValueOnce([{ id: "verified-software" }]);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).resolves.toEqual([
      { id: "verified-software" },
    ]);
    expect(db.toolFindMany).toHaveBeenCalledOnce();
  });

  it("rethrows configured public software read failures", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    db.toolFindMany.mockRejectedValueOnce(new Error("unexpected software failure"));
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).rejects.toThrow(
      "unexpected software failure",
    );
  });
});
