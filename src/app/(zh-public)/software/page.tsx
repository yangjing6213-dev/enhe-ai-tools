import { generateSoftwarePageMetadata, SoftwarePageShell } from "@/app/software/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateSoftwarePageMetadata("zh");
}

export default async function SoftwarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <SoftwarePageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
