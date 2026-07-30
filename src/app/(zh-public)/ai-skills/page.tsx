import { AiSkillsPageShell, generateAiSkillsPageMetadata } from "@/app/ai-skills/page-shell";

export const revalidate = 300;
export const metadata = generateAiSkillsPageMetadata("zh");

export default function AiSkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <AiSkillsPageShell searchParams={searchParams} forceLocale="zh" />;
}
