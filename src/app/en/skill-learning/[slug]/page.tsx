import { generateToolDetailPageMetadata, ToolDetailPageShell } from "@/app/tools/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateToolDetailPageMetadata("en", slug);
}

export default async function EnglishSkillLearningDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="en">
      <ToolDetailPageShell slug={slug} forceLocale="en" expectedType="skill_learning" />
    </PublicSiteChrome>
  );
}
