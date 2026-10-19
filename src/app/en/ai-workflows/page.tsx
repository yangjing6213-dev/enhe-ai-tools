import { AiWorkflowsPageShell, generateAiWorkflowsPageMetadata } from "@/app/ai-workflows/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const dynamic = "force-dynamic";
export const metadata = generateAiWorkflowsPageMetadata("en");

export default async function EnglishAiWorkflowsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return (
    <PublicSiteChrome forceLocale="en">
      <AiWorkflowsPageShell forceLocale="en" searchParams={params} />
    </PublicSiteChrome>
  );
}
