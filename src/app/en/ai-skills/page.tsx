import { AiSkillsPageShell, generateAiSkillsPageMetadata } from "@/app/ai-skills/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;
export const metadata = generateAiSkillsPageMetadata("en");

export default function EnglishAiSkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <PublicSiteChrome forceLocale="en">
      <AiSkillsPageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
