import { AiWorkflowsPageShell, generateAiWorkflowsPageMetadata } from "@/app/ai-workflows/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";
export const metadata = generateAiWorkflowsPageMetadata("zh");

export default async function AiWorkflowsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiWorkflowsPageShell forceLocale="zh" searchParams={params} />
    </PublicSiteChrome>
  );
}
