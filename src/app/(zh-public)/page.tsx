import { generateHomePageMetadata, HomePageShell, publicPageRevalidate } from "@/app/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";

export const revalidate = 300;

export async function generateMetadata() {
  return generateHomePageMetadata("zh");
}

export default async function HomePage() {
  return (
    <PublicSiteChrome forceLocale="zh">
      <HomePageShell forceLocale="zh" />
    </PublicSiteChrome>
  );
}
