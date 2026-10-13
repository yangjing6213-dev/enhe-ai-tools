import type { RedesignLocale } from "@/components/redesign/types";
import type { HomepageCommentCard } from "@/lib/redesign/home/homepage-comment-display";
import type { HomeProductShowcaseItem } from "@/lib/redesign/home/home-product-showcase";
import { EnheRedesignExperienceReviews } from "./EnheRedesignExperienceReviews";
import { EnheRedesignFeatures } from "./EnheRedesignFeatures";
import { EnheRedesignHero } from "./EnheRedesignHero";
import { EnheRedesignProductShowcase } from "./EnheRedesignProductShowcase";

export function EnheRedesignHome({
  locale,
  featuredComments = [],
  featuredProducts,
}: {
  locale: RedesignLocale;
  featuredComments?: readonly HomepageCommentCard[];
  featuredProducts?: readonly HomeProductShowcaseItem[];
}) {
  return (
    <main className="redesign-home-page" data-locale={locale}>
      <EnheRedesignHero locale={locale} />
      <EnheRedesignFeatures locale={locale} />
      <EnheRedesignProductShowcase locale={locale} products={featuredProducts} />
      <EnheRedesignExperienceReviews locale={locale} featuredComments={featuredComments} />
    </main>
  );
}
