import type { Metadata } from "next";
import { PublicSearchDialog } from "@/components/public-search-dialog";
import type { Locale } from "@/lib/dictionaries";
import {
  normalizePublicSearchQuery,
  searchPublicContent,
} from "@/lib/public-search";
import { buildLocalePath, buildPageMetadata } from "@/lib/seo";

type SearchPageParams = Record<string, string | string[] | undefined>;

const searchCopy = {
  zh: {
    title: "搜索",
    inputLabel: "搜索公开内容",
    placeholder: "搜索 AI 工具、资讯、趋势或教程",
    submit: "搜索",
    close: "关闭搜索",
    loading: "正在搜索...",
    initialText: "输入关键词开始搜索。",
    emptyText: "没有找到匹配的公开内容，请尝试其他关键词。",
    errorText: "搜索暂时不可用，请稍后重试。",
    resultCount: "找到 {count} 条公开内容",
    types: {
      tool: "AI工具",
      news: "AI资讯",
      trend: "AI趋势",
      tutorial: "AI教程",
      brand: "关于我们",
    },
  },
  en: {
    title: "Search",
    inputLabel: "Search public content",
    placeholder: "Search AI tools, news, trends, or tutorials",
    submit: "Search",
    close: "Close search",
    loading: "Searching...",
    initialText: "Enter a keyword to start searching.",
    emptyText: "No matching public content. Try another keyword.",
    errorText: "Search is temporarily unavailable. Please try again later.",
    resultCount: "{count} public results",
    types: {
      tool: "AI Tool",
      news: "AI News",
      trend: "AI Trend",
      tutorial: "AI Tutorial",
      brand: "About Us",
    },
  },
} as const;

export function generateSearchPageMetadata(locale: Locale): Metadata {
  const isDbFreeMode = !process.env.DATABASE_URL?.trim();
  const metadata = buildPageMetadata({
    title: locale === "en" ? "Search ENHE AI" : "搜索 ENHE AI",
    description:
      isDbFreeMode
        ? locale === "en"
          ? "Public search content is not available in this local preview because it has not been verified."
          : "本地预览不提供公开搜索内容，因为相关内容尚未核验。"
        : locale === "en"
          ? "Search published ENHE AI tools, news, trend briefings, tutorials, and public brand information."
          : "搜索 ENHE AI 已发布的工具、资讯、趋势简报、教程和公开品牌信息。",
    path: "/search",
    locale: locale === "en" ? "en_US" : "zh_CN",
    localeKey: locale,
  });

  return { ...metadata, robots: { index: false, follow: true } };
}

export async function SearchPageShell({
  searchParams,
  forceLocale,
}: {
  searchParams: Promise<SearchPageParams>;
  forceLocale: Locale;
}) {
  const params = await searchParams;
  const isDbFreeMode = !process.env.DATABASE_URL?.trim();
  const query = normalizePublicSearchQuery(
    Array.isArray(params.q) ? params.q[0] : params.q,
  );
  let failed = false;
  let results = [] as Awaited<ReturnType<typeof searchPublicContent>>;

  if (query) {
    try {
      results = await searchPublicContent(query, forceLocale);
    } catch {
      failed = true;
    }
  }

  return (
    <main
      className="public-search-page"
      data-content-status={isDbFreeMode ? "UNVERIFIED" : undefined}
    >
      <PublicSearchDialog
        searchPath={buildLocalePath("/search", forceLocale)}
        homePath={buildLocalePath("/", forceLocale)}
        query={query}
        results={results}
        failed={failed}
        labels={
          isDbFreeMode
            ? {
                ...searchCopy[forceLocale],
                initialText:
                  forceLocale === "en"
                    ? "UNVERIFIED: Public search content has not been verified; this DB-free preview shows no results."
                    : "UNVERIFIED：公开搜索内容尚未核验，本地无数据库预览不展示结果。",
                emptyText:
                  forceLocale === "en"
                    ? "UNVERIFIED: Public search content has not been verified; this DB-free preview shows no results."
                    : "UNVERIFIED：公开搜索内容尚未核验，本地无数据库预览不展示结果。",
              }
            : searchCopy[forceLocale]
        }
      />
    </main>
  );
}
