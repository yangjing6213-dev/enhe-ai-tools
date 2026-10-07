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

vi.mock("next/server", () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: db.toolFindMany,
    },
  },
}));

describe("pricing page DB-free shell", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["zh", "en"] as const)(
    "renders a noindex UNVERIFIED shell without a catalog read (%s)",
    async (locale) => {
      const { generatePricingPageMetadata, PricingPageShell } = await import(
        "@/app/pricing/page-shell"
      );

      const html = renderToStaticMarkup(
        await PricingPageShell({ forceLocale: locale }),
      );
      const metadata = await generatePricingPageMetadata(locale);

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).toContain("enhe-contentless-page");
      expect(html).not.toContain("OfferCatalog");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(db.toolFindMany).not.toHaveBeenCalled();

      if (locale === "en") {
        expect(html).toContain("Pricing content has not been verified yet");
        expect(metadata.description).toContain(
          "Pricing content is not available in this local preview.",
        );
      } else {
        expect(html).toContain("报价内容尚未核验");
      }
    },
  );
});
