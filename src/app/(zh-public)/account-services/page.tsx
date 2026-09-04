import { AccountServicesPageShell, generateAccountServicesPageMetadata } from "@/app/account-services/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateAccountServicesPageMetadata("zh");
}

export default async function AccountServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <PublicSiteChrome forceLocale="zh">
      <AccountServicesPageShell searchParams={searchParams} forceLocale="zh" />
    </PublicSiteChrome>
  );
}
