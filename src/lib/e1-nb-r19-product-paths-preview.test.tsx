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

vi.mock("@/components/prefetch-link", () => ({
  PrefetchLink: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

const productPathCases = [
  { slug: "work-efficiency", locale: "zh" },
  { slug: "work-efficiency", locale: "en" },
  { slug: "media-generation", locale: "zh" },
  { slug: "media-generation", locale: "en" },
  { slug: "future-ai", locale: "zh" },
  { slug: "future-ai", locale: "en" },
] as const;

describe("E1-NB-R19 product paths DB-free preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
  });

  it("returns no product-path tools without querying Prisma when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    db.toolFindMany.mockResolvedValue([]);

    const { getPublicToolsByCategoryNames } = await import("@/lib/public-content");

    await expect(
      getPublicToolsByCategoryNames(["AI Office", "AI Media"]),
    ).resolves.toEqual([]);
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });

  it.each(productPathCases)(
    "renders a safe DB-free preview for $locale /product-paths/$slug",
    async ({ slug, locale }) => {
      db.toolFindMany.mockResolvedValue([]);
      const { generateProductPathMetadata, ProductPathPageShell } = await import(
        "@/app/product-paths/[slug]/page-shell"
      );

      const html = renderToStaticMarkup(
        await ProductPathPageShell({ slug, forceLocale: locale }),
      );
      const metadata = await generateProductPathMetadata(slug, locale);

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).not.toContain("listing-grid");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("CollectionPage");
      expect(html).not.toContain("ItemList");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(db.toolFindMany).not.toHaveBeenCalled();

      if (locale === "en") {
        expect(html).toContain("Product-path content has not been verified yet");
        expect(metadata.description).toContain(
          "Product-path content is not available in this local preview.",
        );
        expect(html).not.toMatch(/[\u3400-\u9fff]/);
      } else {
        expect(html).toContain("产品路径内容尚未核验");
      }
    },
  );

  it("preserves configured product cards and indexable metadata", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    db.toolFindMany.mockResolvedValueOnce([
      {
        id: "verified-product",
        name: "已核验产品",
        englishName: "Verified Product",
        slug: "verified-product",
        type: "software",
        shortDescription: "A verified product-path listing.",
        category: { name: "AI Office" },
        priceSpecs: [],
        isVipRequired: false,
        downloadCount: 0,
        usageCount: 0,
      },
    ]);
    const { generateProductPathMetadata, ProductPathPageShell } = await import(
      "@/app/product-paths/[slug]/page-shell"
    );

    const html = renderToStaticMarkup(
      await ProductPathPageShell({
        slug: "work-efficiency",
        forceLocale: "en",
      }),
    );
    const metadata = await generateProductPathMetadata("work-efficiency", "en");

    expect(html).toContain("Verified Product");
    expect(html).toContain("listing-grid");
    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();
    expect(db.toolFindMany).toHaveBeenCalledOnce();
  });

  it("preserves the configured P1001 fallback", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    db.toolFindMany.mockRejectedValueOnce(
      Object.assign(new Error("database unavailable"), { code: "P1001" }),
    );
    const { getPublicToolsByCategoryNames } = await import("@/lib/public-content");

    await expect(
      getPublicToolsByCategoryNames(["AI Office"]),
    ).resolves.toEqual([]);
    expect(db.toolFindMany).toHaveBeenCalledOnce();
  });

  it("rethrows unknown configured database failures", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    db.toolFindMany.mockRejectedValueOnce(new Error("unexpected query failure"));
    const { getPublicToolsByCategoryNames } = await import("@/lib/public-content");

    await expect(
      getPublicToolsByCategoryNames(["AI Office"]),
    ).rejects.toThrow("unexpected query failure");
  });
});
