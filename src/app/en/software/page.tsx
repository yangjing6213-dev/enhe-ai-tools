import { generateSoftwarePageMetadata, SoftwarePageShell } from "@/app/software/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateSoftwarePageMetadata("en");
}

export default async function EnglishSoftwarePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="en">
      <SoftwarePageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
