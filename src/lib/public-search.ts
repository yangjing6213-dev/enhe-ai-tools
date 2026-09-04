import type { Prisma } from "@prisma/client";
import { isEnglishNewsArticleIndexable } from "@/lib/ai-news";
import {
  buildLocalizedNewsSummary,
  buildLocalizedNewsTitle,
} from "@/lib/ai-news-localization";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/dictionaries";
import {
  buildCanonicalAiNewsPath,
  buildCanonicalToolPath,
  getCanonicalAiNewsSlug,
} from "@/lib/public-slugs";
import {
  buildLocalizedToolSummary,
  resolveLocalizedToolIdentity,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";

export type PublicSearchResultType = "tool" | "news";

export type PublicSearchResult = {
  id: string;
  type: PublicSearchResultType;
  title: string;
  excerpt: string;
  href: string;
};

const resultLimitPerType = 10;

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
  return excerpt.length > 180 ? excerpt.slice(0, 180).trimEnd() : excerpt;
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
    .filter(
      (article) => locale === "zh" || isEnglishNewsArticleIndexable(article),
    )
    .map((article): PublicSearchResult => ({
      id: `news-${article.id}`,
      type: "news",
      title: buildLocalizedNewsTitle(article, locale),
      excerpt: toPlainExcerpt(
        buildLocalizedNewsSummary(article, locale),
        locale === "en"
          ? "Read this published AI news article."
          : "阅读这篇已发布的 AI 资讯。",
      ),
      href: buildCanonicalAiNewsPath(
        { ...article, slug: getCanonicalAiNewsSlug(article) },
        locale,
      ),
    }));
}

export async function searchPublicContent(
  rawQuery: unknown,
  locale: Locale,
): Promise<PublicSearchResult[]> {
  const query = normalizePublicSearchQuery(rawQuery);
  if (!query) return [];

  const [tools, news] = await Promise.all([
    searchTools(query, locale),
    searchNews(query, locale),
  ]);
  return [...tools, ...news];
}
