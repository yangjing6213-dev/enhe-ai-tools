"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";
import { buildNewsListingLanguageHrefs, buildNewsListingPageHref, newsListingNavigationEvent, type NewsListingCard, type NewsListingLanguagePageCounts } from "@/lib/ai-news-listing";
import { newsPageSize, type NewsSearchFilters } from "@/lib/ai-news";
import type { Locale } from "@/lib/dictionaries";

type ListingLabels = {
  latestTitle: string;
  emptyTitle: string;
  emptyText: string;
  featured: string;
  evidenceUnverified: string;
  evidenceSourceMissing: string;
  evidenceSourceAvailable: string;
  readMore: string;
};

export function AiNewsListing({
  initialArticles,
  initialPage,
  initialPageCount,
  initialLanguagePageCounts,
  locale,
  filters,
  labels,
}: {
  initialArticles: NewsListingCard[];
  initialPage: number;
  initialPageCount: number;
  initialLanguagePageCounts: NewsListingLanguagePageCounts;
  locale: Locale;
  filters: NewsSearchFilters;
  labels: ListingLabels;
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(initialPage);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const languagePageCountsRef = useRef(initialLanguagePageCounts);

  const updateLanguageLinks = useCallback((nextPage: number) => {
    window.dispatchEvent(new CustomEvent(newsListingNavigationEvent, {
      detail: buildNewsListingLanguageHrefs(nextPage, filters, languagePageCountsRef.current),
    }));
  }, [filters]);

  useEffect(() => {
    queueMicrotask(() => updateLanguageLinks(initialPage));
    return () => requestRef.current?.abort();
  }, [initialPage, updateLanguageLinks]);

  const loadPage = useCallback(async (nextPage: number, updateHistory: boolean) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(true);
    setError("");
    const query = new URLSearchParams({ locale, page: String(nextPage) });
    if (filters.q) query.set("q", filters.q);
    if (filters.category) query.set("category", filters.category);
    if (filters.tag) query.set("tag", filters.tag);
    query.set("sort", filters.sort);
    try {
      const response = await fetch(`/api/ai-news/listing?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error("News listing could not be loaded");
      const listing = await response.json() as { articles: NewsListingCard[]; page: number; pageCount: number; languagePageCounts: NewsListingLanguagePageCounts };
      if (controller.signal.aborted) return;
      setArticles(listing.articles);
      setPage(listing.page);
      setPageCount(listing.pageCount);
      languagePageCountsRef.current = listing.languagePageCounts;
      if (updateHistory) {
        window.history.pushState(window.history.state, "", buildNewsListingPageHref(listing.page, locale, filters));
      }
      updateLanguageLinks(listing.page);
    } catch {
      if (!controller.signal.aborted) setError(locale === "en" ? "This page could not be loaded. Please try again." : "这页资讯暂时未能加载，请再试一次。");
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }, [filters, locale, updateLanguageLinks]);

  useEffect(() => {
    const restorePage = () => {
      const url = new URL(window.location.href);
      const pathPage = url.pathname.match(/\/ai-news\/page\/(\d+)\/?$/)?.[1];
      const restoredPage = Number(pathPage ?? url.searchParams.get("page") ?? "1");
      if (Number.isSafeInteger(restoredPage) && restoredPage >= 1) {
        updateLanguageLinks(restoredPage);
        void loadPage(restoredPage, false);
      }
    };
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, [loadPage, updateLanguageLinks]);

  const handlePageClick = (event: MouseEvent<HTMLAnchorElement>, nextPage: number) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!pending) void loadPage(nextPage, true);
  };

  return (
    <section
      className="ai-news-latest-region"
      data-ai-news-region="latest"
      aria-busy={pending}
    >
      <SectionTitle title={labels.latestTitle} />
      {articles.length ? (
        <div className="ai-news-latest-grid grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => <NewsListingArticle key={article.id} article={article} labels={labels} />)}
          {pageCount > 1 ? Array.from({ length: Math.max(0, newsPageSize - articles.length) }, (_, index) => (
            <div key={`empty-slot-${index}`} className="ai-news-pagination-placeholder" aria-hidden="true">
              <div className="aspect-[16/9]" />
              <div className="ai-news-card-body" />
            </div>
          )) : null}
        </div>
      ) : <EmptyState title={labels.emptyTitle} text={labels.emptyText} />}
      {pageCount > 1 ? (
        <nav className="ai-news-pagination mt-8 flex items-center justify-center gap-5" aria-label={locale === "en" ? "News pages" : "资讯分页"}>
          {page > 1 ? (
            <Link href={buildNewsListingPageHref(page - 1, locale, filters)} className="ai-news-page-arrow" aria-label={locale === "en" ? "Previous page" : "上一页"} rel="prev" aria-disabled={pending} onClick={(event) => handlePageClick(event, page - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Link>
          ) : <span className="ai-news-page-arrow" aria-disabled="true"><ChevronLeft aria-hidden="true" /></span>}
          <span className="text-sm font-bold tabular-nums" aria-live="polite">{page} / {pageCount}</span>
          {page < pageCount ? (
            <Link href={buildNewsListingPageHref(page + 1, locale, filters)} className="ai-news-page-arrow" aria-label={locale === "en" ? "Next page" : "下一页"} rel="next" aria-disabled={pending} onClick={(event) => handlePageClick(event, page + 1)}>
              <ChevronRight aria-hidden="true" />
            </Link>
          ) : <span className="ai-news-page-arrow" aria-disabled="true"><ChevronRight aria-hidden="true" /></span>}
        </nav>
      ) : null}
      {pending ? <p className="ai-news-listing-feedback text-center text-sm" role="status">{locale === "en" ? "Loading news…" : "正在加载资讯…"}</p> : null}
      {error ? <p className="ai-news-listing-feedback text-center text-sm" role="alert">{error}</p> : null}
    </section>
  );
}

function NewsListingArticle({ article, labels }: { article: NewsListingCard; labels: ListingLabels }) {
  return (
    <article className="ai-news-interactive-card glass group overflow-hidden rounded-2xl" data-news-id={article.id}>
      <Link href={article.href} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-[var(--marketing-card-soft)]">
          {article.coverImage ? <Image src={article.coverImage} alt={article.title} fill className="content-thumbnail-outline object-cover transition-transform duration-300 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" unoptimized /> : null}
        </div>
        <div className="ai-news-card-body p-5">
          <div className="flex flex-wrap gap-2">
            {article.categoryName ? <Badge className="ai-news-card-tag">{article.categoryName}</Badge> : null}
            {article.isPinned ? <Badge className="ai-news-card-tag">{labels.featured}</Badge> : null}
          </div>
          <h3 className="ai-news-card-title mt-4 break-words text-xl font-black leading-snug text-[var(--marketing-text)]" title={article.title}>{article.title}</h3>
          <p className="ai-news-card-summary mt-3 break-words text-sm leading-7 text-[var(--marketing-muted)]" title={article.summary}>{article.summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--marketing-muted)]">
            <span>{article.dateLabel}</span><span className="tabular-nums">{article.readingTime} min</span><span className="tabular-nums">{article.viewCount} views</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[var(--marketing-muted)]" data-evidence-state={article.hasExternalSources ? "unverified" : "source-missing"}>
            <span>{article.hasExternalSources ? labels.evidenceUnverified : labels.evidenceSourceMissing}</span>
            {article.hasExternalSources ? <span>{labels.evidenceSourceAvailable}</span> : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">{article.tags.map((tag) => <Badge key={tag.id} className="ai-news-card-tag">{tag.name}</Badge>)}</div>
          <span className="mt-5 inline-flex text-sm font-bold text-[var(--marketing-accent)]">{labels.readMore}</span>
        </div>
      </Link>
    </article>
  );
}
