import {
  AiNewsPageShell,
  generateAiNewsPageMetadata,
  getAiNewsPageOneRedirectPath,
} from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { hasActiveNewsFilters, parseNewsSearchParams } from "@/lib/ai-news";
import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return generateAiNewsPageMetadata("en", searchParams);
}

export default async function EnglishAiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = parseNewsSearchParams(params);
  const pageOneRedirectPath = getAiNewsPageOneRedirectPath(params, "en");
  if (pageOneRedirectPath) {
    permanentRedirect(pageOneRedirectPath);
  }
  if (params.page !== undefined && !hasActiveNewsFilters(filters)) {
    permanentRedirect(
      filters.page > 1 ? `/en/ai-news/page/${filters.page}` : "/en/ai-news",
    );
  }

  return (
    <PublicSiteChrome forceLocale="en">
      <AiNewsPageShell searchParams={Promise.resolve(params)} forceLocale="en" />
    </PublicSiteChrome>
  );
}
