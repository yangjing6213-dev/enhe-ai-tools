import type { MetadataRoute } from "next";
import {
  getNewsPageCount,
  getNewsPaginationLocales,
  isEnglishNewsArticleIndexable,
} from "@/lib/ai-news";
import { aiNewsTopics, getAiNewsTopicPath } from "@/lib/ai-news-topics";
import { getPublicAiNewsTopics } from "@/lib/ai-news-topic-config";
import { prisma } from "@/lib/db";
import { getPublicNewsListing } from "@/lib/public-content";
import {
  buildCanonicalToolPath,
  getCanonicalAiNewsSlug,
} from "@/lib/public-slugs";
import { publicDiscoveryRoutes } from "@/lib/public-discovery-manifest";
import {
  absoluteUrl,
  buildLocalePath,
  stripLocalePrefix,
  buildAvailableLanguageAlternates as buildSeoAvailableLanguageAlternates,
} from "@/lib/seo";
import { shouldIndexEnglishToolPage } from "@/lib/tool-localization";

export const dynamic = "force-dynamic";
export const revalidate = 300;
const aiNewsTopicSitemapPathHints = [
  "/ai-news/topics/ai-agent",
  "/ai-news/topics/local-ai",
  "/ai-news/topics/open-source-models",
  "/ai-news/topics/ai-tools",
  "/ai-news/topics/ai-tutorials",
  "/ai-news/topics/ai-account-service",
  "/ai-news/topics/ai-regulation",
] as const;
const sitemapExcludedPaths = new Set(
  publicDiscoveryRoutes
    .filter((route) => route.indexable === false)
    .map((route) => route.path),
);
// Manifest dates describe source edits, not changes to these live database listings.
const dynamicListingPaths = new Set([
  "/software",
  "/ai-skills",
  "/account-services",
  "/skill-learning",
  "/ai-news",
  "/product-demos",
  "/tutorials",
]);

function getPriority(path: string) {
  if (path === "/" || path === "/en") return 1;
  if (path === "/pricing" || path === "/en/pricing") return 0.9;
  if (path === "/ai-trends" || path === "/en/ai-trends") return 0.76;
  return 0.7;
}

function getCanonicalSourcePath(path: string) {
  return path.startsWith("/en/") ? path.slice(3) : path === "/en" ? "/" : path;
}

function absoluteSitemapUrl(path: string) {
  return absoluteUrl(path);
}

function buildLanguageAlternates(path: string) {
  const canonicalSourcePath = stripLocalePrefix(path);
  return {
    "x-default": absoluteSitemapUrl(canonicalSourcePath),
    "zh-CN": absoluteSitemapUrl(buildLocalePath(canonicalSourcePath, "zh")),
    "en-US": absoluteSitemapUrl(buildLocalePath(canonicalSourcePath, "en")),
  };
}

function buildAvailableLanguageAlternates(
  path: string,
  locales: Array<"zh" | "en">,
) {
  return buildSeoAvailableLanguageAlternates(path, locales);
}

function isKnownAiNewsTopicPath(path: string) {
  return aiNewsTopicSitemapPathHints.includes(
    path as (typeof aiNewsTopicSitemapPathHints)[number],
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tools, newsArticles, publicAiNewsTopics, chineseListing, englishListing, forumPosts] = await Promise.all([
    prisma.tool
      .findMany({
        where: { status: "published" },
        select: {
          slug: true,
          name: true,
          englishName: true,
          shortDescription: true,
          content: true,
          updatedAt: true,
          type: true,
        },
      })
      .catch(() => []),
    prisma.newsArticle
      .findMany({
        where: { status: "published" },
        select: {
          slug: true,
          title: true,
          englishTitle: true,
          updatedAt: true,
          englishSummary: true,
          englishContent: true,
        },
      })
      .catch(() => []),
    getPublicAiNewsTopics().catch(() => aiNewsTopics),
    getPublicNewsListing({ locale: "zh", sort: "latest", take: 0 }),
    getPublicNewsListing({ locale: "en", sort: "latest", take: 0 }),
    prisma.forumPost.findMany({
      where: { status: "approved" },
      select: { id: true, updatedAt: true },
    }).catch(() => []),
  ]);

  const chineseNewsPageCount = getNewsPageCount(chineseListing.total);
  const englishNewsTotal = englishListing.total;
  const englishNewsPageCount = getNewsPageCount(englishNewsTotal);
  const newsPaginationEntries = [
    ...Array.from({ length: Math.max(0, chineseNewsPageCount - 1) }, (_, index) => index + 2).map((page) => {
      const path = `/ai-news/page/${page}`;
      const locales = getNewsPaginationLocales(page, englishNewsTotal);
      return {
        url: absoluteUrl(path),
        alternates: { languages: buildAvailableLanguageAlternates(path, [...locales]) },
        changeFrequency: "daily" as const,
        priority: 0.68,
      };
    }),
    ...Array.from({ length: Math.max(0, englishNewsPageCount - 1) }, (_, index) => index + 2).map((page) => {
      const canonicalPath = `/ai-news/page/${page}`;
      return {
        url: absoluteUrl(`/en${canonicalPath}`),
        alternates: { languages: buildAvailableLanguageAlternates(canonicalPath, ["zh", "en"]) },
        changeFrequency: "daily" as const,
        priority: 0.64,
      };
    }),
  ];

  const entries = [
    ...(["/forum", "/en/forum"] as const).map((path) => ({
      url: absoluteSitemapUrl(path),
      alternates: { languages: buildLanguageAlternates("/forum") },
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...forumPosts.map((post) => ({
      url: absoluteSitemapUrl(`/forum/${encodeURIComponent(post.id)}`),
      lastModified: post.updatedAt,
      alternates: { languages: buildAvailableLanguageAlternates(`/forum/${encodeURIComponent(post.id)}`, ["zh"]) },
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...publicDiscoveryRoutes.filter((route) => !sitemapExcludedPaths.has(route.path)).map((route) => ({
      url: absoluteSitemapUrl(route.path),
      ...(dynamicListingPaths.has(stripLocalePrefix(route.path)) ? {} : { lastModified: new Date(route.lastModified) }),
      alternates: {
        languages: buildLanguageAlternates(getCanonicalSourcePath(route.path)),
      },
      changeFrequency:
        route.path === "/" || route.path === "/en"
          ? ("daily" as const)
          : ("weekly" as const),
      priority: getPriority(route.path),
    })),
    ...publicAiNewsTopics.flatMap((topic) =>
      (["zh", "en"] as const).map((locale) => {
        const path = getAiNewsTopicPath(topic.slug, locale);
        return {
          url: absoluteSitemapUrl(path),
          lastModified: new Date(topic.updatedAt),
          alternates: {
            languages: buildAvailableLanguageAlternates(
              `/ai-news/topics/${topic.slug}`,
              ["zh", "en"],
            ),
          },
          changeFrequency: "weekly" as const,
          priority: isKnownAiNewsTopicPath(stripLocalePrefix(path)) ? 0.74 : 0.7,
        };
      }),
    ),
    ...newsPaginationEntries,
    ...tools.flatMap((tool) => {
      const canonicalPath = buildCanonicalToolPath(tool, "zh");
      const hasEnglishPage = shouldIndexEnglishToolPage(tool);
      const localizedRoutes = [
        canonicalPath,
        ...(hasEnglishPage ? [buildCanonicalToolPath(tool, "en")] : []),
      ];

      return localizedRoutes.map((path) => ({
        url: absoluteUrl(path),
        lastModified: tool.updatedAt,
        alternates: {
          languages: buildAvailableLanguageAlternates(
            canonicalPath,
            hasEnglishPage ? ["zh", "en"] : ["zh"],
          ),
        },
        changeFrequency: "weekly" as const,
        priority: tool.type === "software" || tool.type === "ai_skill" ? 0.85 : 0.8,
      }));
    }),
    ...newsArticles.flatMap((newsArticle) => {
      const canonicalSlug = getCanonicalAiNewsSlug(newsArticle);
      const hasEnglishPage = isEnglishNewsArticleIndexable(newsArticle);
      const routes = [
        { path: `/ai-news/${canonicalSlug}`, priority: 0.78 },
        ...(hasEnglishPage
          ? [{ path: `/en/ai-news/${canonicalSlug}`, priority: 0.72 }]
          : []),
      ];

      return routes.map((route) => ({
        url: absoluteUrl(route.path),
        lastModified: newsArticle.updatedAt,
        alternates: {
          languages: buildAvailableLanguageAlternates(
            `/ai-news/${canonicalSlug}`,
            hasEnglishPage ? ["zh", "en"] : ["zh"],
          ),
        },
        changeFrequency: "weekly" as const,
        priority: route.priority,
      }));
    }),
  ];
  const seenUrls = new Set<string>();
  return entries.filter((entry) => {
    if (seenUrls.has(entry.url)) return false;
    seenUrls.add(entry.url);
    return true;
  });
}
