import { AiNewsTopicsPageShell, generateAiNewsTopicsMetadata } from "@/app/ai-news/topics/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

export const revalidate = 300;
export const generateMetadata = () => generateAiNewsTopicsMetadata("zh");

export default function AiNewsTopicsPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsWorkspaceShell locale="zh" currentPathname="/ai-news/topics">
        <AiNewsTopicsPageShell locale="zh" />
      </AiNewsWorkspaceShell>
    </PublicSiteChrome>
  );
}
