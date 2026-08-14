import { generateHomePageMetadata } from "@/app/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { EnheRedesignHome } from "@/components/redesign/home/EnheRedesignHome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateHomePageMetadata("zh");
}

export default async function HomePage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <EnheRedesignHome locale="zh" />
    </PublicSiteChrome>
  );
}
