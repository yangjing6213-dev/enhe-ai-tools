import { generateLegalPageMetadata, generateLegalStaticParams, LegalPageShell } from "@/app/legal/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export const generateStaticParams = generateLegalStaticParams;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateLegalPageMetadata("zh", slug);
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="zh">
      <LegalPageShell slug={slug} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
