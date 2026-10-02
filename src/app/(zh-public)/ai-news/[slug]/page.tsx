import {
  AiNewsDetailPageShell,
  generateAiNewsDetailPageMetadata
} from "@/app/ai-news/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateAiNewsDetailPageMetadata("zh", slug);
}

export default async function AiNewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsWorkspaceShell locale="zh" currentPathname={`/ai-news/${slug}`}>
        <AiNewsDetailPageShell slug={slug} forceLocale="zh" />
      </AiNewsWorkspaceShell>
    </PublicSiteChrome>
  );
}
