import { generateHomePageMetadata } from "@/app/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { EnheRedesignHome } from "@/components/redesign/home/EnheRedesignHome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateHomePageMetadata("en");
}

export default async function EnglishHomePage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <EnheRedesignHome locale="en" />
    </PublicSiteChrome>
  );
}
