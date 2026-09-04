import {
  generateSearchPageMetadata,
  SearchPageShell,
} from "@/app/search/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return generateSearchPageMetadata("zh");
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <SearchPageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
