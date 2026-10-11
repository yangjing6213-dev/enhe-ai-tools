import { describe, expect, it } from "vitest";
import { parseNewsSearchParams } from "@/lib/ai-news";
import { buildNewsListingLanguageHrefs, buildNewsListingPageHref, deduplicateNewsArticles } from "@/lib/ai-news-listing";

describe("AI news listing navigation", () => {
  it("keeps crawlable locale page routes for unfiltered previous and next links", () => {
    const filters = parseNewsSearchParams({});
    expect(buildNewsListingPageHref(1, "zh", filters)).toBe("/ai-news");
    expect(buildNewsListingPageHref(2, "en", filters)).toBe("/en/ai-news/page/2");
  });

  it("preserves all active filters when changing pages and drops page=1", () => {
    const filters = parseNewsSearchParams({ q: "agent workflows", category: "cat", tag: "tag", sort: "hot" });
    expect(buildNewsListingPageHref(2, "en", filters)).toBe("/en/ai-news?q=agent+workflows&category=cat&tag=tag&sort=hot&page=2");
    expect(buildNewsListingPageHref(1, "zh", filters)).toBe("/ai-news?q=agent+workflows&category=cat&tag=tag&sort=hot");
  });

  it("removes repeated card identities while preserving different stories with the same title", () => {
    const first = { id: "one", slug: "one", title: "A title" };
    const other = { id: "two", slug: "two", title: "A title" };
    expect(deduplicateNewsArticles([first, { ...first }, { id: "copy", slug: "one", title: "Copy" }, other])).toEqual([first, other]);
  });

  it("switches to the first filtered page when the target language has fewer pages", () => {
    const filters = parseNewsSearchParams({ q: "agent", sort: "hot" });
    expect(buildNewsListingLanguageHrefs(3, filters, { zh: 4, en: 1 })).toEqual({
      zh: "/ai-news?q=agent&sort=hot&page=3",
      en: "/en/ai-news?q=agent&sort=hot",
    });
  });
});
