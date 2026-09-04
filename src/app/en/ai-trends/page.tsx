import { AiTrendTopicPageShell, generateAiTrendTopicMetadata } from "@/app/ai-trends/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export function generateMetadata() {
  return generateAiTrendTopicMetadata("en");
}

export default function EnglishAiTrendTopicPage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiTrendTopicPageShell forceLocale="en" />
    </PublicSiteChrome>
  );
}
