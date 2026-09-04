import { generatePricingPageMetadata, PricingPageShell } from "@/app/pricing/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generatePricingPageMetadata("en");
}

export default async function EnglishPricingPage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <PricingPageShell forceLocale="en" />
    </PublicSiteChrome>
  );
}
