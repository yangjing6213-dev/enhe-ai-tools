import {
  buildLocalizedNewsSummary,
  buildLocalizedNewsTitle,
  resolveLocalizedNewsCategoryName,
  resolveLocalizedNewsTagName,
} from "@/lib/ai-news-localization";
import { hasActiveNewsFilters, type NewsSearchFilters } from "@/lib/ai-news";
import type { Locale } from "@/lib/dictionaries";
import { normalizeImageSrc } from "@/lib/media";
import type { getPublicNewsListing } from "@/lib/public-content";
import { buildCanonicalAiNewsPath } from "@/lib/public-slugs";
import { buildLocalePath } from "@/lib/seo";

type ListingArticle = Awaited<ReturnType<typeof getPublicNewsListing>>["articles"][number];

export const newsListingNavigationEvent = "enhe:news-listing-navigation";
export type NewsListingLanguagePageCounts = { zh: number; en: number };

export type NewsListingCard = {
  id: string;
  href: string;
  title: string;
  summary: string;
  coverImage: string | null;
  categoryName: string | null;
  isPinned: boolean;
  dateLabel: string;
  readingTime: number;
  viewCount: number;
  hasExternalSources: boolean;
  tags: { id: string; name: string }[];
};

export function deduplicateNewsArticles<T extends { id: string; slug: string }>(articles: T[]) {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  return articles.filter((article) => {
    const slug = article.slug.trim().toLowerCase();
    if (ids.has(article.id) || (slug && slugs.has(slug))) return false;
    ids.add(article.id);
    if (slug) slugs.add(slug);
    return true;
  });
}

export function toNewsListingCards(articles: ListingArticle[], locale: Locale): NewsListingCard[] {
  return deduplicateNewsArticles(articles).map((article) => ({
    id: article.id,
    href: buildCanonicalAiNewsPath(article, locale),
    title: locale === "en" ? buildLocalizedNewsTitle({
      title: article.title,
      englishTitle: article.englishTitle,
      categoryName: article.category?.name,
    }, locale) : article.title,
    summary: locale === "en" ? buildLocalizedNewsSummary({
      title: article.title,
      englishTitle: article.englishTitle,
      summary: article.summary,
      englishSummary: article.englishSummary,
      description: article.description,
      englishDescription: article.englishDescription,
    }, locale) : article.summary,
    coverImage: normalizeImageSrc(article.coverImage),
    categoryName: article.category ? resolveLocalizedNewsCategoryName(article.category.name, locale) : null,
    isPinned: article.isPinned,
    dateLabel: new Date(article.publishedAt ?? article.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN"),
    readingTime: article.readingTime,
    viewCount: article.viewCount,
    hasExternalSources: Boolean(article.externalSources?.length),
    tags: article.tagLinks.slice(0, 3).map(({ tag }) => ({
      id: tag.id,
      name: resolveLocalizedNewsTagName(tag.name, locale) || tag.name,
    })),
  }));
}

export function buildNewsListingPageHref(page: number, locale: Locale, filters: NewsSearchFilters) {
  const filtered = hasActiveNewsFilters(filters);
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("category", filters.category);
  if (filters.tag) query.set("tag", filters.tag);
  if (filters.sort !== "latest") query.set("sort", filters.sort);
  if (filtered && page > 1) query.set("page", String(page));
  const path = buildLocalePath(!filtered && page > 1 ? `/ai-news/page/${page}` : "/ai-news", locale);
  return query.size ? `${path}?${query.toString()}` : path;
}

export function buildNewsListingLanguageHrefs(page: number, filters: NewsSearchFilters, pageCounts: NewsListingLanguagePageCounts) {
  return {
    zh: buildNewsListingPageHref(page <= pageCounts.zh ? page : 1, "zh", filters),
    en: buildNewsListingPageHref(page <= pageCounts.en ? page : 1, "en", filters),
  };
}
