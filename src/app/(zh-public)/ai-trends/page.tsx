import { AiTrendTopicPageShell, generateAiTrendTopicMetadata } from "@/app/ai-trends/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export function generateMetadata() {
  return generateAiTrendTopicMetadata();
}

export default function AiTrendTopicPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiTrendTopicPageShell />
    </PublicSiteChrome>
  );
}
