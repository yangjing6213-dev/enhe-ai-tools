import { generateToolDetailPageMetadata, ToolDetailPageShell } from "@/app/tools/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateToolDetailPageMetadata("zh", slug);
}

export default async function SkillLearningDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <ToolDetailPageShell slug={slug} forceLocale="zh" expectedType="skill_learning" />
    </PublicSiteChrome>
  );
}
