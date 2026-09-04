import { AiTrendDailyArchivePageShell, generateAiTrendDailyArchiveMetadata } from "@/app/ai-trends/daily/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export function generateMetadata() {
  return generateAiTrendDailyArchiveMetadata("en");
}

export default function EnglishAiTrendDailyArchivePage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiTrendDailyArchivePageShell forceLocale="en" />
    </PublicSiteChrome>
  );
}
