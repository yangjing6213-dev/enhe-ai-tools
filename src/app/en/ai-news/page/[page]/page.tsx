import { notFound, permanentRedirect } from "next/navigation";
import {
  AiNewsPageShell,
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

  return (
    <PublicSiteChrome forceLocale="en">
      <AiNewsPageShell
        searchParams={searchParams}
        forceLocale="en"
        pageOverride={page}
      />
    </PublicSiteChrome>
  );
}
