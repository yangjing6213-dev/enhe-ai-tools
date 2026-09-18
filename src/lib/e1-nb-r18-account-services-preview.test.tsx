import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("@/lib/public-content", () => ({
  getPublicToolCategories: vi.fn(async () => []),
  getPublicToolListing: vi.fn(async () => []),
}));

vi.mock("@/components/prefetch-link", () => ({
  PrefetchLink: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

import {
  AccountServicesPageShell,
  generateAccountServicesPageMetadata,
} from "@/app/account-services/page-shell";
import {
  getPublicToolCategories,
  getPublicToolListing,
} from "@/lib/public-content";

const mockedCategories = vi.mocked(getPublicToolCategories);
const mockedListing = vi.mocked(getPublicToolListing);

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.DATABASE_URL;
});

describe("E1-NB-R18 Account Services DB-free UNVERIFIED preview parity", () => {
  it.each(["zh", "en"] as const)(
    "renders a safe UNVERIFIED empty state without service facts (%s)",
    async (locale) => {
      delete process.env.DATABASE_URL;
      mockedCategories.mockResolvedValueOnce([]);
      mockedListing.mockResolvedValueOnce([]);

      const html = renderToStaticMarkup(
        await AccountServicesPageShell({
          searchParams: Promise.resolve({}),
          forceLocale: locale,
        }),
      );

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("data-testid=\"tool-card\"");
      if (locale === "en") {
        expect(html).not.toMatch(/[\u3400-\u9fff]/);
        expect(html).toContain(
          "English account-service content is not available yet",
        );
        expect(html).not.toContain("AI account service guidance helps users");
      } else {
        expect(html).toContain("账号服务内容尚未核验");
        expect(html).not.toContain("AI账号服务适合解决什么问题");
      }
    },
  );

  it("uses noindex-follow metadata for a DB-free Account Services preview", async () => {
    delete process.env.DATABASE_URL;

    const zhMetadata = await generateAccountServicesPageMetadata(
      "zh",
      Promise.resolve({}),
    );
    const enMetadata = await generateAccountServicesPageMetadata(
      "en",
      Promise.resolve({}),
    );

    expect(zhMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.description).toContain(
      "English account-service content is not available in this local preview.",
    );
    expect(JSON.stringify(enMetadata)).not.toMatch(/[\u3400-\u9fff]/);
  });

  it("preserves configured service cards and indexable metadata", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    mockedCategories.mockResolvedValueOnce([]);
    mockedListing.mockResolvedValueOnce([
      {
        id: "account-service-preview",
        name: "已核验账号服务",
        englishName: "Verified Account Service",
        slug: "verified-account-service",
        type: "online",
        shortDescription: "A verified account-service listing.",
        isVipRequired: false,
        downloadCount: 0,
        usageCount: 0,
      },
    ] as never);

    const html = renderToStaticMarkup(
      await AccountServicesPageShell({
        searchParams: Promise.resolve({}),
        forceLocale: "en",
      }),
    );
    const metadata = await generateAccountServicesPageMetadata(
      "en",
      Promise.resolve({}),
    );

    expect(html).toContain("Verified Account Service");
    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();
  });
});
