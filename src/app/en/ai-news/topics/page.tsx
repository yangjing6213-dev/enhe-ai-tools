import { AiNewsTopicsPageShell, generateAiNewsTopicsMetadata } from "@/app/ai-news/topics/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

export const revalidate = 300;
export const generateMetadata = () => generateAiNewsTopicsMetadata("en");

export default function EnglishAiNewsTopicsPage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiNewsWorkspaceShell locale="en" currentPathname="/en/ai-news/topics">
        <AiNewsTopicsPageShell locale="en" />
      </AiNewsWorkspaceShell>
    </PublicSiteChrome>
  );
}
