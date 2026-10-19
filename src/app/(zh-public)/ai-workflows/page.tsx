import { AiWorkflowsPageShell, generateAiWorkflowsPageMetadata } from "@/app/ai-workflows/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;
export const metadata = generateAiWorkflowsPageMetadata("zh");

export default function AiWorkflowsPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiWorkflowsPageShell forceLocale="zh" />
    </PublicSiteChrome>
  );
}
