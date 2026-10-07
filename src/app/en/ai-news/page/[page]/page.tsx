import { notFound, permanentRedirect } from "next/navigation";
import {
  AiNewsPageShell,
  buildAiNewsLanguageHrefs,
  generateAiNewsPageMetadata,
} from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";
import {
  buildAiNewsPaginationLanguageHrefs,
  parseNewsPaginationPage,
} from "@/lib/ai-news";
import type { RedesignLanguageHrefs } from "@/components/redesign/types";

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
    "en",
    searchParams,
    page !== null && page > 1 ? page : 1,
  );
}

export default async function EnglishAiNewsPaginationPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const page = parseNewsPaginationPage((await params).page);
  if (page === null) notFound();
  if (page === 1) permanentRedirect("/en/ai-news");
  const resolvedSearchParams = await searchParams;
  const languageHrefs: RedesignLanguageHrefs = buildAiNewsPaginationLanguageHrefs(
    page,
    resolvedSearchParams,
  );

  return (
    <PublicSiteChrome forceLocale="en" languageHrefs={languageHrefs}>
      <AiNewsWorkspaceShell locale="en" currentPathname={`/en/ai-news/page/${page}`}>
        <AiNewsPageShell
          searchParams={Promise.resolve(resolvedSearchParams)}
          forceLocale="en"
          pageOverride={page}
        />
      </AiNewsWorkspaceShell>
    </PublicSiteChrome>
  );
}
