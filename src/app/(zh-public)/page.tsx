import { generateHomePageMetadata } from "@/app/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { EnheRedesignHome } from "@/components/redesign/home/EnheRedesignHome";
import { getHomepageCommentCards } from "@/lib/redesign/home/homepage-comment-data";
import { getHomeProductShowcase } from "@/lib/redesign/home/home-product-showcase-data";

export const revalidate = 300;

export async function generateMetadata() {
  return generateHomePageMetadata("zh");
}

export default async function HomePage() {
  const [featuredComments, featuredProducts] = await Promise.all([
    getHomepageCommentCards("zh"),
    getHomeProductShowcase(),
  ]);

  return (
    <PublicSiteChrome forceLocale="zh">
      <EnheRedesignHome locale="zh" featuredComments={featuredComments} featuredProducts={featuredProducts} />
    </PublicSiteChrome>
  );
}
