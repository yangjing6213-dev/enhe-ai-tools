import { AiSkillsPageShell, generateAiSkillsPageMetadata } from "@/app/ai-skills/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;
export const metadata = generateAiSkillsPageMetadata("zh");

export default function AiSkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiSkillsPageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
