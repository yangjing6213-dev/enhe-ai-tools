import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const db = vi.hoisted(() => ({
  newsArticleFindMany: vi.fn(),
  newsArticleCount: vi.fn(),
  newsCategoryFindMany: vi.fn(),
  newsTagFindMany: vi.fn(),
  analyticsEventFindMany: vi.fn(),
  newsKeywordInterventionFindMany: vi.fn(),
}));

const topicReads = vi.hoisted(() => ({
  getPublicAiNewsTopics: vi.fn(async () => []),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    newsArticle: {
      findMany: db.newsArticleFindMany,
      count: db.newsArticleCount,
    },
    newsCategory: { findMany: db.newsCategoryFindMany },
    newsTag: { findMany: db.newsTagFindMany },
    analyticsEvent: { findMany: db.analyticsEventFindMany },
    newsKeywordIntervention: {
      findMany: db.newsKeywordInterventionFindMany,
    },
  },
}));

vi.mock("@/lib/ai-news-topic-config", () => ({
  filterAiNewsTopicArticles: (articles: unknown[]) => articles,
  getPublicAiNewsTopic: vi.fn(async () => null),
  getPublicAiNewsTopicSlugs: vi.fn(async () => []),
  getPublicAiNewsTopics: topicReads.getPublicAiNewsTopics,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    prefetch?: boolean;
  }) => {
    void prefetch;
    return React.createElement("a", { ...props, href: String(href) }, children);
  },
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));

const dbFreePageCases = [
  { locale: "zh", searchParams: {}, expectedText: "AI 资讯内容尚未核验" },
  { locale: "zh", searchParams: { q: "ai" }, expectedText: "AI 资讯内容尚未核验" },
  { locale: "en", searchParams: {}, expectedText: "AI News content has not been verified" },
  { locale: "en", searchParams: { q: "ai" }, expectedText: "AI News content has not been verified" },
] as const;

describe("E1-NB-R22 AI News listing DB-free preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
    db.newsArticleFindMany.mockResolvedValue([]);
    db.newsArticleCount.mockResolvedValue(0);
    db.newsCategoryFindMany.mockResolvedValue([]);
    db.newsTagFindMany.mockResolvedValue([]);
    db.analyticsEventFindMany.mockResolvedValue([]);
    db.newsKeywordInterventionFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.DATABASE_URL;
  });

  it("returns empty AI News listings, categories, and tags without querying Prisma when DATABASE_URL is unset", async () => {
    const {
      getPublicNewsCategories,
      getPublicNewsListing,
      getPublicNewsTags,
    } = await import("@/lib/public-content");

    await expect(
      getPublicNewsListing({ sort: "latest", locale: "en" }),
    ).resolves.toEqual({ articles: [], total: 0 });
    await expect(getPublicNewsCategories()).resolves.toEqual([]);
    await expect(getPublicNewsTags("en")).resolves.toEqual([]);

    expect(db.newsArticleFindMany).not.toHaveBeenCalled();
    expect(db.newsArticleCount).not.toHaveBeenCalled();
    expect(db.newsCategoryFindMany).not.toHaveBeenCalled();
    expect(db.newsTagFindMany).not.toHaveBeenCalled();
  });

  it("returns empty AI News discovery without querying Prisma or synthesizing content", async () => {
    const { getPublicAiNewsDiscovery } = await import("@/lib/public-content");

    await expect(getPublicAiNewsDiscovery("en")).resolves.toEqual({
      keywordCloudItems: [],
      topicCollectionItems: [],
    });

    expect(db.newsArticleFindMany).not.toHaveBeenCalled();
    expect(db.analyticsEventFindMany).not.toHaveBeenCalled();
    expect(db.newsKeywordInterventionFindMany).not.toHaveBeenCalled();
  });

  it.each(dbFreePageCases)(
    "renders a safe DB-free $locale AI News state for $searchParams",
    async ({ locale, searchParams, expectedText }) => {
      const { AiNewsPageShell, generateAiNewsPageMetadata } = await import(
        "@/app/ai-news/page-shell"
      );

      const html = renderToStaticMarkup(
        await AiNewsPageShell({
          searchParams: Promise.resolve(searchParams),
          forceLocale: locale,
        }),
      );
      const metadata = await generateAiNewsPageMetadata(
        locale,
        Promise.resolve(searchParams),
      );

      expect(html).toContain('data-content-status="UNVERIFIED"');
      expect(html).toContain("UNVERIFIED");
      expect(html).toContain(expectedText);
      expect(html).not.toContain("<script");
      expect(html).not.toContain("CollectionPage");
      expect(html).not.toContain("FAQPage");
      expect(metadata.robots).toEqual({ index: false, follow: true });
      expect(String(metadata.description)).toContain(
        locale === "en"
          ? "not available in this local preview"
          : "本地预览不提供 AI 资讯内容",
      );
      expect(topicReads.getPublicAiNewsTopics).not.toHaveBeenCalled();
      expect(db.newsArticleFindMany).not.toHaveBeenCalled();
      expect(db.newsArticleCount).not.toHaveBeenCalled();
      expect(db.newsCategoryFindMany).not.toHaveBeenCalled();
      expect(db.newsTagFindMany).not.toHaveBeenCalled();
      expect(db.analyticsEventFindMany).not.toHaveBeenCalled();
      expect(db.newsKeywordInterventionFindMany).not.toHaveBeenCalled();
    },
  );

  it("preserves the configured AI News listing and indexable metadata", async () => {
    process.env.DATABASE_URL = "postgresql://configured.invalid/enhe";
    const publishedAt = new Date("2026-09-18T00:00:00.000Z");
    db.newsArticleFindMany.mockResolvedValue([
      {
        id: "verified-news",
        slug: "verified-news",
        title: "已核验资讯",
        subtitle: null,
        summary: "一条已核验的资讯摘要。",
        description: null,
        keywords: null,
        seoKeywords: null,
        englishTitle: null,
        englishSummary: null,
        englishDescription: null,
        englishKeywords: null,
        englishSeoKeywords: null,
        coverImage: null,
        readingTime: 3,
        viewCount: 1,
        isPinned: false,
        isFeatured: false,
        publishedAt,
        createdAt: publishedAt,
        category: { id: "news-category", name: "AI News" },
        tagLinks: [],
      },
    ]);
    db.newsArticleCount.mockResolvedValue(1);
    db.newsCategoryFindMany.mockResolvedValue([
      { id: "news-category", name: "AI News" },
    ]);
    db.newsTagFindMany.mockResolvedValue([]);
    const { AiNewsPageShell, generateAiNewsPageMetadata } = await import(
      "@/app/ai-news/page-shell"
    );

    const html = renderToStaticMarkup(
      await AiNewsPageShell({
        searchParams: Promise.resolve({}),
        forceLocale: "zh",
      }),
    );
    const metadata = await generateAiNewsPageMetadata(
      "zh",
      Promise.resolve({}),
    );

    expect(html).toContain("已核验资讯");
    expect(html).toContain("CollectionPage");
    expect(html).not.toContain('data-content-status="UNVERIFIED"');
    expect(metadata.robots).toBeUndefined();
    expect(db.newsArticleFindMany).toHaveBeenCalled();
    expect(db.newsCategoryFindMany).toHaveBeenCalledOnce();
    expect(db.newsTagFindMany).toHaveBeenCalledOnce();
    expect(topicReads.getPublicAiNewsTopics).toHaveBeenCalledOnce();
  });
});
