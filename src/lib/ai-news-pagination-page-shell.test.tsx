import React, { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const publicContent = vi.hoisted(() => ({
  getPublicAiNewsDiscovery: vi.fn(async () => ({
    keywordCloudItems: [],
    topicCollectionItems: [],
  })),
  getPublicNewsCategories: vi.fn(async () => []),
  getPublicNewsListing: vi.fn(async (filters: { take?: number }) => ({
    articles: [],
    total: filters.take ? 0 : 10,
  })),
  getPublicNewsTags: vi.fn(async () => []),
  getPublicAiNewsTopics: vi.fn(async () => []),
}));

vi.mock("next/navigation", () => navigation);
vi.mock("@/lib/public-content", () => publicContent);
vi.stubGlobal("React", React);

import {
  AiNewsPageShell,
  generateAiNewsPageMetadata,
} from "@/app/ai-news/page-shell";
import { StructuredData } from "@/components/structured-data";

function findElement(node: ReactNode, type: unknown): ReactNode | null {
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;
  if (node.type === type) return node;

  for (const child of Children.toArray(node.props.children)) {
    const match = findElement(child, type);
    if (match) return match;
  }

  return null;
}

function pathname(value: unknown) {
  return new URL(String(value)).pathname;
}

describe("AI news pagination page shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found when the requested page exceeds the actual page count", async () => {
    await expect(
      AiNewsPageShell({
        searchParams: Promise.resolve({}),
        forceLocale: "zh",
        pageOverride: 3,
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalledOnce();
  });

  it("rejects an oversized query page before loading any news listing", async () => {
    await expect(
      AiNewsPageShell({
        searchParams: Promise.resolve({
          page: String(Number.MAX_SAFE_INTEGER),
        }),
        forceLocale: "zh",
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(publicContent.getPublicNewsListing).not.toHaveBeenCalled();
  });

  it("omits an English pagination alternate when that English page does not exist", async () => {
    const metadata = await generateAiNewsPageMetadata(
      "zh",
      Promise.resolve({}),
      3,
    );
    const languages = metadata.alternates?.languages as Record<string, string>;

    expect(pathname(metadata.alternates?.canonical)).toBe("/ai-news/page/3");
    expect(pathname(languages["zh-CN"])).toBe("/ai-news/page/3");
    expect(pathname(languages["x-default"])).toBe("/ai-news/page/3");
    expect(languages["en-US"]).toBeUndefined();
  });

  it.each([
    ["zh", "/ai-news/page/2", "/en/ai-news/page/2"],
    ["en", "/en/ai-news/page/2", "/ai-news/page/2"],
  ] as const)(
    "uses the current %s page in metadata, hreflang, and page schemas",
    async (locale, expectedPath, alternatePath) => {
      const metadata = await generateAiNewsPageMetadata(
        locale,
        Promise.resolve({}),
        2,
      );
      const languages = metadata.alternates?.languages as Record<
        string,
        string
      >;

      expect(pathname(metadata.alternates?.canonical)).toBe(expectedPath);
      expect(pathname(languages[locale === "en" ? "zh-CN" : "en-US"])).toBe(
        alternatePath,
      );

      const tree = await AiNewsPageShell({
        searchParams: Promise.resolve({}),
        forceLocale: locale,
        pageOverride: 2,
      });
      const structuredData = findElement(tree, StructuredData);
      expect(isValidElement(structuredData)).toBe(true);

      const schemas = (
        structuredData as ReturnType<typeof StructuredData>
      ).props.data as Array<{ "@type": string; url?: string }>;
      const collectionPage = schemas.find(
        (schema) => schema["@type"] === "CollectionPage",
      );
      const webPage = schemas.find((schema) => schema["@type"] === "WebPage");

      expect(pathname(collectionPage?.url)).toBe(expectedPath);
      expect(pathname(webPage?.url)).toBe(expectedPath);
    },
  );
});
