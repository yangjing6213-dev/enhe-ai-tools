import { generatePricingPageMetadata, PricingPageShell } from "@/app/pricing/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generatePricingPageMetadata("zh");
}

export default async function PricingPage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <PricingPageShell forceLocale="zh" />
    </PublicSiteChrome>
  );
}
