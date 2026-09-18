import { isEnglishNewsArticleIndexable } from "@/lib/ai-news";
import {
  buildLocalizedNewsSummary,
  buildLocalizedNewsTitle,
} from "@/lib/ai-news-localization";
import {
  getAiTrendBriefingSummaries,
  localizeAiTrendBriefingView,
} from "@/lib/ai-trends";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/dictionaries";
import {
  buildCanonicalAiNewsPath,
  buildCanonicalToolPath,
  getCanonicalAiNewsSlug,
} from "@/lib/public-slugs";
import { buildLocalePath } from "@/lib/seo";
import {
  buildLocalizedToolSummary,
  resolveLocalizedToolIdentity,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";
import type { Prisma } from "@prisma/client";

export type PublicSearchResultType =
  | "tool"
  | "news"
  | "trend"
  | "tutorial"
  | "brand";

export type PublicSearchResult = {
  id: string;
  type: PublicSearchResultType;
  title: string;
  excerpt: string;
  href: string;
};

const resultLimitPerType = 8;

export function normalizePublicSearchQuery(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
}

export function buildPublicToolSearchWhere(
  query: string,
): Prisma.ToolWhereInput {
  return {
    status: "published",
    type: { not: "skill_learning" },
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { englishName: { contains: query, mode: "insensitive" } },
      { shortDescription: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
      {
        category: {
          is: { name: { contains: query, mode: "insensitive" } },
        },
      },
    ],
  };
}

function toPlainExcerpt(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  const excerpt = normalized || fallback;
  return excerpt.length > 180 ? `${excerpt.slice(0, 177).trimEnd()}...` : excerpt;
}

export function buildBrandSearchResult(
  rawQuery: unknown,
  locale: Locale,
): PublicSearchResult | null {
  const query = normalizePublicSearchQuery(rawQuery).toLowerCase();
  if (!query || (!query.includes("enhe") && !query.includes("恩禾"))) {
    return null;
  }

  return {
    id: "brand-enhe-ai",
    type: "brand",
    title: locale === "en" ? "About ENHE AI" : "关于恩禾 ENHE AI",
    excerpt:
      locale === "en"
        ? "Learn about ENHE AI, its public services, contact details, and operating principles."
        : "了解恩禾 ENHE AI 的公开服务、联系方式与运营原则。",
    href: buildLocalePath("/about", locale),
  };
}

async function searchTools(query: string, locale: Locale) {
  const tools = await prisma.tool.findMany({
    where: buildPublicToolSearchWhere(query),
    select: {
      id: true,
      slug: true,
      name: true,
      englishName: true,
      shortDescription: true,
      content: true,
      type: true,
      category: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: resultLimitPerType,
  });

  return tools
    .filter((tool) => locale === "zh" || shouldIndexEnglishToolPage(tool))
    .map((tool): PublicSearchResult => {
      const localizationInput = {
        ...tool,
        categoryName: tool.category?.name,
      };
      return {
        id: `tool-${tool.id}`,
        type: "tool",
        title: resolveLocalizedToolIdentity(tool, locale).primaryName,
        excerpt: toPlainExcerpt(
          buildLocalizedToolSummary(localizationInput, locale),
          locale === "en"
            ? "View this published AI tool."
            : "查看这款已发布的 AI 工具。",
        ),
        href: buildCanonicalToolPath(tool, locale),
      };
    });
}

async function searchTutorials(query: string, locale: Locale) {
  const tutorials = await prisma.tutorial.findMany({
    where: {
      status: "active",
      tool: { status: "published", type: "skill_learning" },
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
        { commonErrors: { contains: query, mode: "insensitive" } },
        { tool: { name: { contains: query, mode: "insensitive" } } },
        { tool: { englishName: { contains: query, mode: "insensitive" } } },
        { tool: { shortDescription: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      tool: {
        select: {
          id: true,
          slug: true,
          name: true,
          englishName: true,
          shortDescription: true,
          content: true,
          type: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: resultLimitPerType * 2,
  });

  const seenToolIds = new Set<string>();
  const results: PublicSearchResult[] = [];
  for (const tutorial of tutorials) {
    if (seenToolIds.has(tutorial.tool.id)) continue;
    if (locale === "en" && !shouldIndexEnglishToolPage(tutorial.tool)) continue;

    seenToolIds.add(tutorial.tool.id);
    results.push({
      id: `tutorial-${tutorial.id}`,
      type: "tutorial",
      title: resolveLocalizedToolIdentity(tutorial.tool, locale).primaryName,
      excerpt: toPlainExcerpt(
        locale === "zh"
          ? tutorial.title || tutorial.content
          : buildLocalizedToolSummary(tutorial.tool, locale),
        locale === "en" ? "Open this practical AI tutorial." : "打开这篇 AI 实战教程。",
      ),
      href: buildCanonicalToolPath(tutorial.tool, locale),
    });
    if (results.length >= resultLimitPerType) break;
  }

  return results;
}

async function searchNews(query: string, locale: Locale) {
  const isEnglish = locale === "en";
  const articles = await prisma.newsArticle.findMany({
    where: {
      status: "published",
      OR: isEnglish
        ? [
            { englishTitle: { contains: query, mode: "insensitive" } },
            { englishSummary: { contains: query, mode: "insensitive" } },
            { englishDescription: { contains: query, mode: "insensitive" } },
            { englishKeywords: { contains: query, mode: "insensitive" } },
            { englishContent: { contains: query, mode: "insensitive" } },
          ]
        : [
            { title: { contains: query, mode: "insensitive" } },
            { subtitle: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { keywords: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      description: true,
      englishTitle: true,
      englishSummary: true,
      englishDescription: true,
      englishContent: true,
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: resultLimitPerType,
  });

  return articles
    .filter((article) => locale === "zh" || isEnglishNewsArticleIndexable(article))
    .map((article): PublicSearchResult => ({
      id: `news-${article.id}`,
      type: "news",
      title: buildLocalizedNewsTitle(article, locale),
      excerpt: toPlainExcerpt(
        buildLocalizedNewsSummary(article, locale),
        locale === "en" ? "Read this published AI news article." : "阅读这篇已发布的 AI 资讯。",
      ),
      href: buildCanonicalAiNewsPath(
        { ...article, slug: getCanonicalAiNewsSlug(article) },
        locale,
      ),
    }));
}

async function searchTrends(query: string, locale: Locale) {
  const normalizedQuery = query.toLocaleLowerCase(locale === "en" ? "en-US" : "zh-CN");
  const briefings = await getAiTrendBriefingSummaries(60);

  return briefings
    .map((briefing) => localizeAiTrendBriefingView(briefing, locale))
    .filter((briefing) =>
      [
        briefing.title,
        briefing.summary,
        briefing.coreConclusion,
        ...briefing.publicHighlights,
      ]
        .join(" ")
        .toLocaleLowerCase(locale === "en" ? "en-US" : "zh-CN")
        .includes(normalizedQuery),
    )
    .slice(0, resultLimitPerType)
    .map((briefing): PublicSearchResult => ({
      id: `trend-${briefing.id}`,
      type: "trend",
      title: briefing.title,
      excerpt: toPlainExcerpt(
        briefing.summary || briefing.coreConclusion,
        locale === "en" ? "Read this published AI trend briefing." : "阅读这篇已发布的 AI 趋势简报。",
      ),
      href: buildLocalePath(`/ai-trends/daily/${briefing.slug}`, locale),
    }));
}

export async function searchPublicContent(
  rawQuery: unknown,
  locale: Locale,
): Promise<PublicSearchResult[]> {
  const query = normalizePublicSearchQuery(rawQuery);
  if (!query) return [];
  if (!process.env.DATABASE_URL?.trim()) return [];

  const [tools, tutorials, news, trends] = await Promise.all([
    searchTools(query, locale),
    searchTutorials(query, locale),
    searchNews(query, locale),
    searchTrends(query, locale),
  ]);
  const brand = buildBrandSearchResult(query, locale);

  return [...(brand ? [brand] : []), ...tools, ...news, ...trends, ...tutorials];
}
