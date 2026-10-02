import {
  AiNewsDetailPageShell,
  generateAiNewsDetailPageMetadata
} from "@/app/ai-news/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateAiNewsDetailPageMetadata("en", slug);
}

export default async function EnglishAiNewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="en">
      <AiNewsWorkspaceShell locale="en" currentPathname={`/en/ai-news/${slug}`}>
        <AiNewsDetailPageShell slug={slug} forceLocale="en" />
      </AiNewsWorkspaceShell>
    </PublicSiteChrome>
  );
}
