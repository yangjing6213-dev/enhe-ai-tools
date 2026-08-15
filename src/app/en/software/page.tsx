import { generateSoftwarePageMetadata, SoftwarePageShell } from "@/app/software/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { getProductionSoftwareRouteData } from "@/lib/redesign/software/software-production";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return generateSoftwarePageMetadata("en", searchParams);
}

export default async function EnglishSoftwarePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const routeData = await getProductionSoftwareRouteData({
    locale: "en",
    searchParams: params,
  });
  if (!routeData) notFound();

  return (
    <PublicSiteChrome forceLocale="en" languageHrefs={routeData.languageHrefs}>
      <SoftwarePageShell
        searchParams={Promise.resolve(params)}
        forceLocale="en"
        preloadedListing={routeData.listing}
      />
    </PublicSiteChrome>
  );
}
