import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { isEnglishNewsArticleIndexable } from "@/lib/ai-news";
import {
  buildAiNewsKeywordCloud,
  buildAiNewsTopicCollections,
  defaultAiNewsExternalSeoProvider,
  normalizeAiNewsKeyword,
  type AiNewsKeywordCandidate,
  type AiNewsKeywordInterventionRule,
} from "@/lib/ai-news-discovery";
import { prisma } from "@/lib/db";
import {
  getCanonicalAiNewsSlug,
  getCanonicalToolSlug,
} from "@/lib/public-slugs";
import { parseVirtualToolCategoryId } from "@/lib/tool-category-groups";

const publicContentRevalidate = 300;

type PublicToolType = "software" | "online" | "skill_learning";

export type PublicNewsListingFilters = {
  q?: string;
  category?: string;
  tag?: string;
  sort?: "latest" | "hot" | "featured";
  skip?: number;
  take?: number;
  locale?: "zh" | "en";
};

type PublicSlugMatch = {
  id: string;
  slug: string;
  canonicalSlug: string;
};

function isRecoverablePublicReadError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const errorWithCode = error as Error & { code?: unknown };
  const code = typeof errorWithCode.code === "string" ? errorWithCode.code : "";
  const message = error.message;

  return (
    code === "P1001" ||
    /Can't reach database server/i.test(message) ||
    /ECONNREFUSED/i.test(message)
  );
}

function buildToolCategoryWhere(categoryId?: string): Prisma.ToolWhereInput {
  const categoryName = parseVirtualToolCategoryId(categoryId);
  if (categoryName) {
    return { category: { is: { name: categoryName } } };
  }

  return categoryId ? { categoryId } : {};
}

const getCachedHomeRecommendedTools = unstable_cache(
  async () => {
    try {
      return await prisma.tool.findMany({
        where: { status: "published" },
        include: {
          category: true,
          priceSpecs: {
            where: { status: "active" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [
          { isHomeRecommended: "desc" },
          { sortOrder: "asc" },
          { createdAt: "desc" },
        ],
        take: 6,
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) {
        return [];
      }

      throw error;
    }
  },
  ["public-home-recommended-tools"],
  {
    revalidate: publicContentRevalidate,
    tags: ["public-home", "public-tools"],
  },
);

const getCachedPublicToolListing = unstable_cache(
  async (
    type: PublicToolType,
    categoryId?: string,
    keyword?: string,
    paid?: string,
    sort?: string,
  ) => {
    try {
      return await prisma.tool.findMany({
        where: {
          type,
          status: "published",
          ...buildToolCategoryWhere(categoryId),
          ...(type === "software" && paid === "paid"
            ? { isDownloadPaid: true }
            : type === "software" && paid === "free"
              ? { isDownloadPaid: false }
              : {}),
          ...(keyword
            ? {
                OR: [
                  { name: { contains: keyword, mode: "insensitive" } },
                  { englishName: { contains: keyword, mode: "insensitive" } },
                  {
                    shortDescription: {
                      contains: keyword,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          category: true,
          priceSpecs: {
            where: { status: "active" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy:
          type === "software"
            ? sort === "hot"
              ? { downloadCount: "desc" }
              : { createdAt: "desc" }
            : sort === "hot"
              ? { usageCount: "desc" }
              : { createdAt: "desc" },
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) {
        return [];
      }

      throw error;
    }
  },
  ["public-tool-listing"],
  { revalidate: publicContentRevalidate, tags: ["public-tools"] },
);

const getCachedPublicTutorials = unstable_cache(
  async () => {
    try {
      return await prisma.tutorial.findMany({
        where: { status: "active", tool: { status: "published" } },
        include: { tool: true },
        orderBy: { sortOrder: "asc" },
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) {
        return [];
      }

      throw error;
    }
  },
  ["public-tutorials"],
  { revalidate: publicContentRevalidate, tags: ["public-tutorials"] },
);

const getCachedPublicToolCategories = unstable_cache(
  async (type: PublicToolType) => {
    try {
      return await prisma.toolCategory.findMany({
        where: { type, status: "active" },
        orderBy: { sortOrder: "asc" },
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) {
        return [];
      }

      throw error;
    }
  },
  ["public-tool-categories"],
  { revalidate: publicContentRevalidate, tags: ["public-tools"] },
);

const getCachedPublicLegalPages = unstable_cache(
  async (locale: "zh" | "en", slug: string) => {
    const { getLegalPage } = await import("@/lib/legal");
    return getLegalPage(slug, locale);
  },
  ["public-legal-pages"],
  { revalidate: publicContentRevalidate, tags: ["public-legal-pages"] },
);

function buildNewsWhere(
  filters: PublicNewsListingFilters,
): Prisma.NewsArticleWhereInput {
  const keyword = filters.q?.trim();

  return {
    status: "published",
    ...(filters.category ? { categoryId: filters.category } : {}),
    ...(filters.tag
      ? { tagLinks: { some: { tag: { slug: filters.tag } } } }
      : {}),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { subtitle: { contains: keyword, mode: "insensitive" } },
            { summary: { contains: keyword, mode: "insensitive" } },
            { description: { contains: keyword, mode: "insensitive" } },
            { keywords: { contains: keyword, mode: "insensitive" } },
            {
              tagLinks: {
                some: {
                  tag: { name: { contains: keyword, mode: "insensitive" } },
                },
              },
            },
          ],
        }
      : {}),
  };
}

const getCachedPublicNewsListing = unstable_cache(
  async (filters: PublicNewsListingFilters) => {
    try {
      const where = buildNewsWhere(filters);
      const orderBy: Prisma.NewsArticleOrderByWithRelationInput[] =
        filters.sort === "hot"
          ? [{ viewCount: "desc" }, { publishedAt: "desc" }]
          : filters.sort === "featured"
            ? [
                { isPinned: "desc" },
                { isFeatured: "desc" },
                { sortOrder: "asc" },
                { publishedAt: "desc" },
              ]
            : [{ isPinned: "desc" }, { publishedAt: "desc" }];
      if (filters.locale === "en") {
        const candidateArticles = await prisma.newsArticle.findMany({
          where,
          include: { category: true, tagLinks: { include: { tag: true } } },
          orderBy,
          take: Math.max((filters.skip ?? 0) + (filters.take ?? 9), 80),
        });
        const indexableArticles = candidateArticles.filter(
          isEnglishNewsArticleIndexable,
        );
        const skip = filters.skip ?? 0;
        const take = filters.take ?? 9;

        return {
          articles: indexableArticles.slice(skip, skip + take),
          total: indexableArticles.length,
        };
      }

      const [articles, total] = await Promise.all([
        prisma.newsArticle.findMany({
          where,
          include: { category: true, tagLinks: { include: { tag: true } } },
          orderBy,
          skip: filters.skip ?? 0,
          take: filters.take ?? 9,
        }),
        prisma.newsArticle.count({ where }),
      ]);

      return { articles, total };
    } catch (error) {
      if (isRecoverablePublicReadError(error))
        return { articles: [], total: 0 };
      throw error;
    }
  },
  ["public-news-listing"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] },
);

const getCachedPublicNewsCategories = unstable_cache(
  async () => {
    try {
      return await prisma.newsCategory.findMany({
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return [];
      throw error;
    }
  },
  ["public-news-categories"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] },
);

const getCachedPublicNewsTags = unstable_cache(
  async () => {
    try {
      return await prisma.newsTag.findMany({
        where: { status: "active" },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return [];
      throw error;
    }
  },
  ["public-news-tags"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] },
);

const getCachedPublicNewsArticleBySlug = unstable_cache(
  async (slug: string) => {
    try {
      return await prisma.newsArticle.findFirst({
        where: { slug, status: "published" },
        include: {
          category: true,
          tagLinks: { include: { tag: true } },
          externalSources: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return null;
      throw error;
    }
  },
  ["public-news-article-by-slug"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] },
);

const getCachedPublicToolSlugIndex = unstable_cache(
  async () => {
    try {
      const tools = await prisma.tool.findMany({
        where: { status: "published" },
        select: { id: true, slug: true, name: true, englishName: true },
      });

      return tools.map((tool) => ({
        id: tool.id,
        slug: tool.slug,
        canonicalSlug: getCanonicalToolSlug(tool),
      }));
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return [];
      throw error;
    }
  },
  ["public-tool-slug-index"],
  { revalidate: publicContentRevalidate, tags: ["public-tools"] },
);

const getCachedPublicNewsSlugIndex = unstable_cache(
  async () => {
    try {
      const articles = await prisma.newsArticle.findMany({
        where: { status: "published" },
        select: { id: true, slug: true, title: true, englishTitle: true },
      });

      return articles.map((article) => ({
        id: article.id,
        slug: article.slug,
        canonicalSlug: getCanonicalAiNewsSlug(article),
      }));
    } catch (error) {
      if (isRecoverablePublicReadError(error)) return [];
      throw error;
    }
  },
  ["public-news-slug-index"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] },
);

function findSlugMatch(items: PublicSlugMatch[], requestedSlug: string) {
  return (
    items.find((item) => item.slug === requestedSlug) ??
    items.find((item) => item.canonicalSlug === requestedSlug) ??
    null
  );
}

function splitNewsKeywordList(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[,\n，、|]/)
    .map((item) => normalizeAiNewsKeyword(item))
    .filter((item): item is string => Boolean(item));
}

function getArticleHeat(article: {
  viewCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}) {
  const publishedTime = article.publishedAt ?? article.createdAt;
  const freshnessDays = Math.max(
    0,
    Math.floor((Date.now() - publishedTime.getTime()) / 86400000),
  );
  return {
    totalHeat:
      article.viewCount +
      (article.isPinned ? 20 : 0) +
      (article.isFeatured ? 10 : 0),
    freshnessDays,
  };
}

function buildKeywordCandidatesFromArticles(
  locale: "zh" | "en",
  articles: Array<{
    keywords: string | null;
    seoKeywords: string | null;
    englishKeywords: string | null;
    englishSeoKeywords: string | null;
    viewCount: number;
    isPinned: boolean;
    isFeatured: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    tagLinks: Array<{ tag: { name: string } }>;
  }>,
) {
  const candidates = new Map<string, AiNewsKeywordCandidate>();
  const tagFallbacks = new Map<string, AiNewsKeywordCandidate>();

  for (const article of articles) {
    const { totalHeat, freshnessDays } = getArticleHeat(article);
    const keywordValues =
      locale === "en"
        ? [
            ...splitNewsKeywordList(article.englishKeywords),
            ...splitNewsKeywordList(article.englishSeoKeywords),
          ]
        : [
            ...splitNewsKeywordList(article.keywords),
            ...splitNewsKeywordList(article.seoKeywords),
          ];
    const seenKeywords = new Set<string>();

    for (const keyword of keywordValues) {
      const current = candidates.get(keyword);
      const next: AiNewsKeywordCandidate = current
        ? {
            keyword,
            articleCount:
              current.articleCount + (seenKeywords.has(keyword) ? 0 : 1),
            searchCount30d: current.searchCount30d,
            totalHeat: current.totalHeat + totalHeat,
            freshnessDays: Math.min(current.freshnessDays, freshnessDays),
            tagHits: current.tagHits,
            keywordFieldHits: current.keywordFieldHits + 1,
          }
        : {
            keyword,
            articleCount: 1,
            searchCount30d: 0,
            totalHeat,
            freshnessDays,
            tagHits: 0,
            keywordFieldHits: 1,
          };

      candidates.set(keyword, next);
      seenKeywords.add(keyword);
    }

    const seenTags = new Set<string>();
    for (const tagLink of article.tagLinks) {
      const keyword = normalizeAiNewsKeyword(tagLink.tag.name);
      if (!keyword) continue;

      const current = candidates.get(keyword);
      const next: AiNewsKeywordCandidate = current
        ? {
            keyword,
            articleCount:
              current.articleCount + (seenTags.has(keyword) ? 0 : 1),
            searchCount30d: current.searchCount30d,
            totalHeat: current.totalHeat + totalHeat,
            freshnessDays: Math.min(current.freshnessDays, freshnessDays),
            tagHits: current.tagHits + 1,
            keywordFieldHits: current.keywordFieldHits,
          }
        : {
            keyword,
            articleCount: 1,
            searchCount30d: 0,
            totalHeat,
            freshnessDays,
            tagHits: 1,
            keywordFieldHits: 0,
          };

      const fallbackCurrent = tagFallbacks.get(keyword);
      const fallbackNext: AiNewsKeywordCandidate = fallbackCurrent
        ? {
            keyword,
            articleCount:
              fallbackCurrent.articleCount + (seenTags.has(keyword) ? 0 : 1),
            searchCount30d: fallbackCurrent.searchCount30d,
            totalHeat: fallbackCurrent.totalHeat + totalHeat,
            freshnessDays: Math.min(
              fallbackCurrent.freshnessDays,
              freshnessDays,
            ),
            tagHits: fallbackCurrent.tagHits + 1,
            keywordFieldHits: fallbackCurrent.keywordFieldHits,
          }
        : {
            keyword,
            articleCount: 1,
            searchCount30d: 0,
            totalHeat,
            freshnessDays,
            tagHits: 1,
            keywordFieldHits: 0,
          };

      candidates.set(keyword, next);
      tagFallbacks.set(keyword, fallbackNext);
      seenTags.add(keyword);
    }
  }

  return {
    candidates: Array.from(candidates.values()),
    tagFallbacks: Array.from(tagFallbacks.values()),
  };
}

function mergeSearchSignalsIntoCandidates(
  candidates: AiNewsKeywordCandidate[],
  searchQueries: string[],
) {
  const map = new Map(
    candidates.map((candidate) => [candidate.keyword, { ...candidate }]),
  );

  for (const rawQuery of searchQueries) {
    const keyword = normalizeAiNewsKeyword(rawQuery);
    if (!keyword) continue;

    const current = map.get(keyword);
    if (!current) {
      map.set(keyword, {
        keyword,
        articleCount: 0,
        searchCount30d: 1,
        totalHeat: 0,
        freshnessDays: 30,
        tagHits: 0,
        keywordFieldHits: 0,
      });
      continue;
    }

    current.searchCount30d += 1;
    map.set(keyword, current);
  }

  return Array.from(map.values());
}

function normalizeKeywordInterventions(
  locale: "zh" | "en",
  rows: Array<{
    keyword: string;
    locale: string;
    isPinned: boolean;
    isHidden: boolean;
    displayName: string | null;
    weightBoost: number;
  }>,
) {
  return rows
    .filter((row) => row.locale === locale)
    .map(
      (row) =>
        ({
          keyword: row.keyword,
          locale,
          isPinned: row.isPinned,
          isHidden: row.isHidden,
          displayName: row.displayName,
          weightBoost: row.weightBoost,
        }) satisfies AiNewsKeywordInterventionRule,
    );
}

function isMissingKeywordInterventionTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { table?: unknown } };
  return (
    candidate.code === "P2021" &&
    typeof candidate.meta?.table === "string" &&
    candidate.meta.table.includes("news_keyword_interventions")
  );
}

const getCachedPublicAiNewsDiscovery = unstable_cache(
  async (locale: "zh" | "en") => {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [articles, analyticsRows, interventionRows] = await Promise.all([
        prisma.newsArticle.findMany({
          where: { status: "published" },
          select: {
            keywords: true,
            seoKeywords: true,
            englishKeywords: true,
            englishSeoKeywords: true,
            viewCount: true,
            isPinned: true,
            isFeatured: true,
            publishedAt: true,
            createdAt: true,
            tagLinks: { select: { tag: { select: { name: true } } } },
          },
        }),
        prisma.analyticsEvent.findMany({
          where: { eventName: "search_ai_news", createdAt: { gte: since } },
          select: { metadata: true },
        }),
        prisma.newsKeywordIntervention.findMany({
          select: {
            keyword: true,
            locale: true,
            isPinned: true,
            isHidden: true,
            displayName: true,
            weightBoost: true,
          },
        }),
      ]);

      const { candidates: articleCandidates, tagFallbacks } =
        buildKeywordCandidatesFromArticles(locale, articles);
      const searchQueries = analyticsRows
        .map((row) => {
          const metadata = (row.metadata ?? {}) as Record<string, unknown>;
          return typeof metadata.query === "string" ? metadata.query : "";
        })
        .filter(Boolean);
      const mergedCandidates = mergeSearchSignalsIntoCandidates(
        articleCandidates,
        searchQueries,
      );
      const interventions = normalizeKeywordInterventions(
        locale,
        interventionRows,
      );
      const keywordCloudItems = await buildAiNewsKeywordCloud({
        locale,
        candidates: mergedCandidates,
        interventions,
        externalProvider: defaultAiNewsExternalSeoProvider,
      });
      const topicCollectionItems = buildAiNewsTopicCollections({
        locale,
        keywordItems: keywordCloudItems,
        fallbackTags: tagFallbacks.map((candidate) => ({
          keyword: candidate.keyword,
          displayName: candidate.keyword,
          score: candidate.totalHeat + candidate.tagHits * 4,
          articleCount: candidate.articleCount,
          searchCount30d: candidate.searchCount30d,
          totalHeat: candidate.totalHeat,
          isPinned: false,
        })),
      });

      return { keywordCloudItems, topicCollectionItems };
    } catch (error) {
      if (
        isRecoverablePublicReadError(error) ||
        isMissingKeywordInterventionTableError(error)
      ) {
        return { keywordCloudItems: [], topicCollectionItems: [] };
      }

      throw error;
    }
  },
  ["public-ai-news-discovery"],
  { revalidate: publicContentRevalidate, tags: ["public-news"] },
);

export async function getHomeRecommendedTools() {
  return getCachedHomeRecommendedTools();
}

export async function getPublicToolCategories(type: PublicToolType) {
  return getCachedPublicToolCategories(type);
}

export async function getPublicToolListing(
  type: PublicToolType,
  categoryId?: string,
  keyword?: string,
  paid?: string,
  sort?: string,
) {
  return getCachedPublicToolListing(type, categoryId, keyword, paid, sort);
}

export async function getPublicTutorials() {
  return getCachedPublicTutorials();
}

export async function getPublicLegalPage(locale: "zh" | "en", slug: string) {
  return getCachedPublicLegalPages(locale, slug);
}

export async function getPublicNewsListing(filters: PublicNewsListingFilters) {
  return getCachedPublicNewsListing(filters);
}

export async function getPublicNewsCategories() {
  return getCachedPublicNewsCategories();
}

export async function getPublicNewsTags() {
  return getCachedPublicNewsTags();
}

export async function getPublicNewsArticleBySlug(slug: string) {
  return getCachedPublicNewsArticleBySlug(slug);
}

export async function getPublicAiNewsDiscovery(locale: "zh" | "en") {
  return getCachedPublicAiNewsDiscovery(locale);
}

export async function resolvePublicToolSlug(slug: string) {
  const items = await getCachedPublicToolSlugIndex();
  return findSlugMatch(items, slug);
}

export async function resolvePublicNewsArticleSlug(slug: string) {
  const items = await getCachedPublicNewsSlugIndex();
  return findSlugMatch(items, slug);
}
