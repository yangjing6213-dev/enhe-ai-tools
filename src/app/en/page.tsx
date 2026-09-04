import { generateHomePageMetadata, HomePageShell } from "@/app/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateHomePageMetadata("en");
}

export default async function EnglishHomePage() {
  return (
    <PublicSiteChrome forceLocale="en">
      <HomePageShell forceLocale="en" />
    </PublicSiteChrome>
  );
}
