import { AiNewsPageShell, generateAiNewsPageMetadata } from "@/app/ai-news/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateAiNewsPageMetadata("zh");
}

export default async function AiNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsPageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
