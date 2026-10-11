import { NextResponse } from "next/server";
import { getNewsPageCount, parseNewsPaginationPage, parseNewsSearchParams } from "@/lib/ai-news";
import { toNewsListingCards } from "@/lib/ai-news-listing";
import { getPublicNewsListing } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  if (["q", "category", "tag", "sort", "page", "locale"].some((key) => searchParams.getAll(key).length > 1)) {
    return NextResponse.json({ message: "Duplicate news filter." }, { status: 400 });
  }
  const requestedPage = searchParams.get("page") ?? "1";
  const requestedLocale = searchParams.get("locale") ?? "zh";
  if (!parseNewsPaginationPage(requestedPage) || !["zh", "en"].includes(requestedLocale)) {
    return NextResponse.json({ message: "Invalid news page or language." }, { status: 400 });
  }
  if (["q", "category", "tag"].some((key) => (searchParams.get(key)?.length ?? 0) > 200)) {
    return NextResponse.json({ message: "News filter is too long." }, { status: 400 });
  }
  const filters = parseNewsSearchParams(Object.fromEntries(searchParams));
  const locale = searchParams.get("locale") === "en" ? "en" : "zh";
  const listing = await getPublicNewsListing({ ...filters, locale });
  const pageCount = getNewsPageCount(listing.total);
  if (filters.page > pageCount) {
    return NextResponse.json({ message: "News page not found." }, { status: 404 });
  }
  const otherLocale = locale === "zh" ? "en" : "zh";
  const otherListing = await getPublicNewsListing({ ...filters, skip: 0, take: 0, locale: otherLocale });
  return NextResponse.json({
    articles: toNewsListingCards(listing.articles, locale),
    page: filters.page,
    pageCount,
    languagePageCounts: {
      [locale]: pageCount,
      [otherLocale]: getNewsPageCount(otherListing.total),
    },
  }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
