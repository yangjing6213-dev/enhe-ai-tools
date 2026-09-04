import { AiNewsPageShell, generateAiNewsPageMetadata } from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateAiNewsPageMetadata("en");
}

export default async function EnglishAiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiNewsPageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
