import { generateSkillLearningPageMetadata, SkillLearningPageShell } from "@/app/skill-learning/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateSkillLearningPageMetadata("zh");
}

export default async function SkillLearningPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <SkillLearningPageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
