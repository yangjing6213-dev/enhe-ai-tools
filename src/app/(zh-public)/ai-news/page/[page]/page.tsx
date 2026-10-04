import { notFound, permanentRedirect } from "next/navigation";
import {
  AiNewsPageShell,
  buildAiNewsLanguageHrefs,
  generateAiNewsPageMetadata,
} from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { parseNewsPaginationPage } from "@/lib/ai-news";

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const page = parseNewsPaginationPage((await params).page);
  return generateAiNewsPageMetadata(
    "zh",
    searchParams,
    page !== null && page > 1 ? page : 1,
  );
}

export default async function AiNewsPaginationPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const page = parseNewsPaginationPage((await params).page);
  if (page === null) notFound();
  if (page === 1) permanentRedirect("/ai-news");
  const queryParams = await searchParams;

  return (
    <PublicSiteChrome
      forceLocale="zh"
      languageHrefs={buildAiNewsLanguageHrefs(queryParams, page)}
    >
      <AiNewsPageShell
        searchParams={Promise.resolve(queryParams)}
        forceLocale="zh"
        pageOverride={page}
      />
    </PublicSiteChrome>
  );
}
