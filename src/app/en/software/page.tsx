import { generateSoftwarePageMetadata, SoftwarePageShell } from "@/app/software/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return generateSoftwarePageMetadata("en", searchParams);
}

export default async function EnglishSoftwarePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="en">
      <SoftwarePageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
