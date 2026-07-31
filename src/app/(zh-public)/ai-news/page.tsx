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
  return generateAiNewsPageMetadata("zh", searchParams);
}

export default async function AiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = parseNewsSearchParams(params);
  const pageOneRedirectPath = getAiNewsPageOneRedirectPath(params, "zh");
  if (pageOneRedirectPath) {
    permanentRedirect(pageOneRedirectPath);
  }
  if (params.page !== undefined && !hasActiveNewsFilters(filters)) {
    permanentRedirect(filters.page > 1 ? `/ai-news/page/${filters.page}` : "/ai-news");
  }

  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsPageShell searchParams={Promise.resolve(params)} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
