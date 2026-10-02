import {
  AiNewsTopicPageShell,
  generateAiNewsTopicMetadata,
  generateAiNewsTopicStaticParams,
} from "@/app/ai-news/topics/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { AiNewsWorkspaceShell } from "@/components/redesign/ai-news-workspace-shell";

export const revalidate = 300;

export const generateStaticParams = generateAiNewsTopicStaticParams;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return generateAiNewsTopicMetadata("zh", slug);
}

export default async function AiNewsTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <AiNewsWorkspaceShell locale="zh" currentPathname={`/ai-news/topics/${slug}`}>
        <AiNewsTopicPageShell slug={slug} forceLocale="zh" />
      </AiNewsWorkspaceShell>
    </PublicSiteChrome>
  );
}
