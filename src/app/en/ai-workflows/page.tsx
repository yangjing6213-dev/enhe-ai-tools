import { AiWorkflowsPageShell, generateAiWorkflowsPageMetadata } from "@/app/ai-workflows/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;
export const metadata = generateAiWorkflowsPageMetadata("en");

export default function EnglishAiWorkflowsPage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiWorkflowsPageShell forceLocale="en" />
    </PublicSiteChrome>
  );
}
