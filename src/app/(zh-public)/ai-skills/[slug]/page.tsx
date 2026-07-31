import { generateToolDetailPageMetadata, ToolDetailPageShell } from "@/app/tools/[slug]/page-shell";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateToolDetailPageMetadata("zh", slug);
}

export default async function AiSkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ToolDetailPageShell slug={slug} forceLocale="zh" expectedType="ai_skill" />;
}
