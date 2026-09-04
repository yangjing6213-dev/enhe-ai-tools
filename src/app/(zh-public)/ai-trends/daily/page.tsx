import { AiTrendDailyArchivePageShell, generateAiTrendDailyArchiveMetadata } from "@/app/ai-trends/daily/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export function generateMetadata() {
  return generateAiTrendDailyArchiveMetadata();
}

export default function AiTrendDailyArchivePage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiTrendDailyArchivePageShell />
    </PublicSiteChrome>
  );
}
