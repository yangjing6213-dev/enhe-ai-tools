import type { MetadataRoute } from "next";
import { isEnglishNewsArticleIndexable } from "@/lib/ai-news";
import { aiNewsTopics, getAiNewsTopicPath } from "@/lib/ai-news-topics";
import { prisma } from "@/lib/db";
import {
  buildCanonicalToolPath,
  getCanonicalAiNewsSlug,
} from "@/lib/public-slugs";
import {
  absoluteUrl,
  buildLocalePath,
  stripLocalePrefix,
  buildAvailableLanguageAlternates as buildSeoAvailableLanguageAlternates,
} from "@/lib/seo";
import { shouldIndexEnglishToolPage } from "@/lib/tool-localization";

export const dynamic = "force-dynamic";
export const revalidate = 300;
const aiTrendTopicPaths = ["/ai-trends", "/en/ai-trends"] as const;
const aiNewsTopicSitemapPathHints = [
  "/ai-news/topics/ai-agent",
  "/ai-news/topics/local-ai",
  "/ai-news/topics/open-source-models",
  "/ai-news/topics/ai-tools",
  "/ai-news/topics/ai-tutorials",
  "/ai-news/topics/ai-account-service",
  "/ai-news/topics/ai-regulation",
] as const;

const staticRoutes = [
  "/",
  "/en",
  "/software",
  "/en/software",
  "/account-services",
  "/en/account-services",
  "/skill-learning",
  "/en/skill-learning",
  "/pricing",
  "/en/pricing",
  "/tutorials",
  "/en/tutorials",
  "/ai-news",
  "/en/ai-news",
  "/legal/user-agreement",
  "/en/legal/user-agreement",
  "/legal/privacy-policy",
  "/en/legal/privacy-policy",
  "/legal/membership-refund",
  "/en/legal/membership-refund",
  "/legal/disclaimer",
  "/en/legal/disclaimer",
  "/legal/copyright-complaint",
  "/en/legal/copyright-complaint",
  "/legal/minor-protection",
  "/en/legal/minor-protection",
] as const;

const staticRouteLastModified: Record<(typeof staticRoutes)[number], Date> = {
  "/": new Date("2026-06-17T00:00:00.000Z"),
  "/en": new Date("2026-06-17T00:00:00.000Z"),
  "/software": new Date("2026-06-17T00:00:00.000Z"),
  "/en/software": new Date("2026-06-17T00:00:00.000Z"),
  "/account-services": new Date("2026-06-17T00:00:00.000Z"),
  "/en/account-services": new Date("2026-06-17T00:00:00.000Z"),
  "/skill-learning": new Date("2026-06-17T00:00:00.000Z"),
  "/en/skill-learning": new Date("2026-06-17T00:00:00.000Z"),
  "/pricing": new Date("2026-06-17T00:00:00.000Z"),
  "/en/pricing": new Date("2026-06-17T00:00:00.000Z"),
  "/tutorials": new Date("2026-06-17T00:00:00.000Z"),
  "/en/tutorials": new Date("2026-06-17T00:00:00.000Z"),
  "/ai-news": new Date("2026-06-18T00:00:00.000Z"),
  "/en/ai-news": new Date("2026-06-18T00:00:00.000Z"),
  "/legal/user-agreement": new Date("2026-06-17T00:00:00.000Z"),
  "/en/legal/user-agreement": new Date("2026-06-17T00:00:00.000Z"),
  "/legal/privacy-policy": new Date("2026-06-17T00:00:00.000Z"),
  "/en/legal/privacy-policy": new Date("2026-06-17T00:00:00.000Z"),
  "/legal/membership-refund": new Date("2026-06-17T00:00:00.000Z"),
  "/en/legal/membership-refund": new Date("2026-06-17T00:00:00.000Z"),
  "/legal/disclaimer": new Date("2026-06-17T00:00:00.000Z"),
  "/en/legal/disclaimer": new Date("2026-06-17T00:00:00.000Z"),
  "/legal/copyright-complaint": new Date("2026-06-17T00:00:00.000Z"),
  "/en/legal/copyright-complaint": new Date("2026-06-17T00:00:00.000Z"),
  "/legal/minor-protection": new Date("2026-06-17T00:00:00.000Z"),
  "/en/legal/minor-protection": new Date("2026-06-17T00:00:00.000Z"),
};

function getPriority(path: string) {
  if (path === "/" || path === "/en") return 1;
  if (path === "/pricing" || path === "/en/pricing") return 0.9;
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
  const tools = await prisma.tool
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
    .catch(() => []);
  const newsArticles = await prisma.newsArticle
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
    .catch(() => []);

  return [
    ...staticRoutes.map((path) => ({
      url: absoluteSitemapUrl(path),
      lastModified: staticRouteLastModified[path],
      alternates: {
        languages: buildLanguageAlternates(getCanonicalSourcePath(path)),
      },
      changeFrequency:
        path === "/" || path === "/en"
          ? ("daily" as const)
          : ("weekly" as const),
      priority: getPriority(path),
    })),
    ...aiTrendTopicPaths.map((path) => ({
      url: absoluteSitemapUrl(path),
      lastModified: new Date("2026-06-19T00:00:00.000Z"),
      alternates: {
        languages: buildLanguageAlternates("/ai-trends"),
      },
      changeFrequency: "weekly" as const,
      priority: 0.76,
    })),
    ...aiNewsTopics.flatMap((topic) =>
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
        priority: tool.type === "software" ? 0.85 : 0.8,
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
}
