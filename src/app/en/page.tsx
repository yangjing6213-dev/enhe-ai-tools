import { generateHomePageMetadata } from "@/app/page-shell";
import { PublicSiteChrome } from "@/components/public-site-chrome";
import { EnheRedesignHome } from "@/components/redesign/home/EnheRedesignHome";
import { getHomepageCommentCards } from "@/lib/redesign/home/homepage-comment-data";

export const revalidate = 300;

export async function generateMetadata() {
  return generateHomePageMetadata("en");
}

export default async function EnglishHomePage() {
  const featuredComments = await getHomepageCommentCards("en");

  return (
    <PublicSiteChrome forceLocale="en">
      <EnheRedesignHome locale="en" featuredComments={featuredComments} />
    </PublicSiteChrome>
  );
}
