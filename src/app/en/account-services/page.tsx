import { AccountServicesPageShell, generateAccountServicesPageMetadata } from "@/app/account-services/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateAccountServicesPageMetadata("en");
}

export default async function EnglishAccountServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="en">
      <AccountServicesPageShell searchParams={searchParams} forceLocale="en" />
    </PublicSiteChrome>
  );
}
