import { generateLegalPageMetadata, generateLegalStaticParams, LegalPageShell } from "@/app/legal/[slug]/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export const generateStaticParams = generateLegalStaticParams;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return generateLegalPageMetadata("en", slug);
}

export default async function EnglishLegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PublicSiteChrome forceLocale="en">
      <LegalPageShell slug={slug} forceLocale="en" />
    </PublicSiteChrome>
  );
}
