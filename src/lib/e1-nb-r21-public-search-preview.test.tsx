import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const dataReads = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
  tutorialFindMany: vi.fn(),
  newsArticleFindMany: vi.fn(),
  trendSummaries: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findMany: dataReads.toolFindMany },
    tutorial: { findMany: dataReads.tutorialFindMany },
    newsArticle: { findMany: dataReads.newsArticleFindMany },
  },
}));

vi.mock("@/lib/ai-trends", () => ({
  getAiTrendBriefingSummaries: dataReads.trendSummaries,
  localizeAiTrendBriefingView: (briefing: unknown) => briefing,
}));

vi.mock("next/dynamic", () => ({
  default: () => function MockSearchStrands() {
    return null;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/prefetch-link", () => ({
  PrefetchLink: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement("a", props, children),
}));

const dbFreePageCases = [
  { locale: "zh", searchParams: {}, expectedText: "公开搜索内容尚未核验" },
  { locale: "zh", searchParams: { q: "ai" }, expectedText: "公开搜索内容尚未核验" },
  { locale: "en", searchParams: {}, expectedText: "Public search content has not been verified" },
  { locale: "en", searchParams: { q: "ai" }, expectedText: "Public search content has not been verified" },
] as const;

describe("E1-NB-R21 public search DB-free preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
    dataReads.toolFindMany.mockResolvedValue([]);
    dataReads.tutorialFindMany.mockResolvedValue([]);
    dataReads.newsArticleFindMany.mockResolvedValue([]);
    dataReads.trendSummaries.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
  });

  it("returns no results without reaching public data reads when DATABASE_URL is unset", async () => {
    const { searchPublicContent } = await import("@/lib/public-search");

    await expect(searchPublicContent("ai", "en")).resolves.toEqual([]);
    expect(dataReads.toolFindMany).not.toHaveBeenCalled();
    expect(dataReads.tutorialFindMany).not.toHaveBeenCalled();
    expect(dataReads.newsArticleFindMany).not.toHaveBeenCalled();
    expect(dataReads.trendSummaries).not.toHaveBeenCalled();
  });

  it.each(dbFreePageCases)(
    "renders a safe DB-free $locale search state for $searchParams",
    async ({ locale, searchParams, expectedText }) => {
      const { generateSearchPageMetadata, SearchPageShell } = await import(
        "@/app/search/page-shell"
      );

      const html = renderToStaticMarkup(
        await SearchPageShell({
          searchParams: Promise.resolve(searchParams),
          forceLocale: locale,
        }),
      );
      const metadata = generateSearchPageMetadata(locale);

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).toContain(expectedText);
      expect(html).not.toContain("public-search-result cursor-target");
      expect(html).not.toContain("ItemList");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(String(metadata.description)).toContain(
        locale === "en"
          ? "not available in this local preview"
          : "本地预览不提供公开搜索内容",
      );
      expect(dataReads.toolFindMany).not.toHaveBeenCalled();
      expect(dataReads.tutorialFindMany).not.toHaveBeenCalled();
      expect(dataReads.newsArticleFindMany).not.toHaveBeenCalled();
      expect(dataReads.trendSummaries).not.toHaveBeenCalled();
    },
  );

  it("preserves configured multi-source search reads", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    const { searchPublicContent } = await import("@/lib/public-search");

    await expect(searchPublicContent("ai", "en")).resolves.toEqual([]);
    expect(dataReads.toolFindMany).toHaveBeenCalledOnce();
    expect(dataReads.tutorialFindMany).toHaveBeenCalledOnce();
    expect(dataReads.newsArticleFindMany).toHaveBeenCalledOnce();
    expect(dataReads.trendSummaries).toHaveBeenCalledOnce();
  });
});
