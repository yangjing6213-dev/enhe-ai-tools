import {
  generateSearchPageMetadata,
  SearchPageShell,
} from "@/app/search/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateSearchPageMetadata("en");
}

export default function EnglishSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PublicSiteChrome forceLocale="en">
      <SearchPageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
