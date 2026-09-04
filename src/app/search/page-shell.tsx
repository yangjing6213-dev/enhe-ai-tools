import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Locale } from "@/lib/dictionaries";
import {
  normalizePublicSearchQuery,
  searchPublicContent,
} from "@/lib/public-search";
import { buildLocalePath, buildPageMetadata } from "@/lib/seo";

type SearchPageParams = Record<string, string | string[] | undefined>;

export function generateSearchPageMetadata(locale: Locale): Metadata {
  const metadata = buildPageMetadata({
    title: locale === "en" ? "Search ENHE AI" : "搜索 ENHE AI",
    description:
      locale === "en"
        ? "Search published ENHE AI tools and AI news by product name, category, summary, or topic."
        : "按产品名称、分类、摘要或主题搜索 ENHE AI 已发布的工具和 AI 资讯。",
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

  const copy =
    forceLocale === "en"
      ? {
          title: "Search ENHE AI",
          placeholder: "Search tools, categories, summaries, or AI news",
          submit: "Search",
          initial: "Enter a keyword to search public content.",
          empty: "No matching public content. Try another keyword.",
          error: "Search is temporarily unavailable. Please try again later.",
          count: `${results.length} results`,
          tool: "AI Tool",
          news: "AI News",
        }
      : {
          title: "搜索 ENHE AI",
          placeholder: "搜索工具、分类、摘要或 AI 资讯",
          submit: "搜索",
          initial: "输入关键词搜索公开内容。",
          empty: "没有找到匹配内容，请尝试其他关键词。",
          error: "搜索暂时不可用，请稍后重试。",
          count: `找到 ${results.length} 条结果`,
          tool: "AI工具",
          news: "AI资讯",
        };

  return (
    <main>
      <section className="mx-auto min-h-[60vh] w-full max-w-5xl px-5 py-14 sm:px-8">
        <h1 className="text-3xl font-bold text-[var(--marketing-text)]">
          {copy.title}
        </h1>
        <form
          action={buildLocalePath("/search", forceLocale)}
          method="get"
          role="search"
          className="surface-panel mt-7 flex gap-3 p-4"
        >
          <label className="sr-only" htmlFor="public-search-input">
            {copy.title}
          </label>
          <input
            id="public-search-input"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={copy.placeholder}
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/20 px-4 py-3 text-[var(--marketing-text)] outline-none focus:border-[var(--marketing-accent)]"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--marketing-accent)] px-5 font-semibold text-black"
          >
            <Search size={18} aria-hidden="true" />
            {copy.submit}
          </button>
        </form>

        <p className="mt-5 text-sm text-[var(--marketing-muted)]" aria-live="polite">
          {failed
            ? copy.error
            : !query
              ? copy.initial
              : results.length
                ? copy.count
                : copy.empty}
        </p>

        {!failed && results.length ? (
          <div className="mt-6 grid gap-3">
            {results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                className="surface-panel block p-5 transition hover:border-[var(--marketing-accent)]"
              >
                <span className="text-xs font-semibold text-[var(--marketing-accent)]">
                  {result.type === "tool" ? copy.tool : copy.news}
                </span>
                <h2 className="mt-2 text-lg font-semibold text-[var(--marketing-text)]">
                  {result.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--marketing-muted)]">
                  {result.excerpt}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
