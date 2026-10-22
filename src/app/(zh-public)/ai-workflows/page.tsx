import { AiWorkflowsPageShell, generateAiWorkflowsPageMetadata } from "@/app/ai-workflows/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import type { AiWorkflowCatalogSearchParams } from "@/lib/ai-workflows/catalog";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<AiWorkflowCatalogSearchParams> }) {
  return generateAiWorkflowsPageMetadata("zh", await searchParams);
}

export default async function AiWorkflowsPage({ searchParams }: { searchParams: Promise<AiWorkflowCatalogSearchParams> }) {
  const params = await searchParams;
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiWorkflowsPageShell forceLocale="zh" searchParams={params} />
    </PublicSiteChrome>
  );
}
