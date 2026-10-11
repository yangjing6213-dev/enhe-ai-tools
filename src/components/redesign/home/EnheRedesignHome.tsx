import type { RedesignLocale } from "@/components/redesign/types";
import type { HomepageCommentCard } from "@/lib/redesign/home/homepage-comment-display";
import { EnheRedesignExperienceReviews } from "./EnheRedesignExperienceReviews";
import { EnheRedesignFeatures } from "./EnheRedesignFeatures";
import { EnheRedesignHero } from "./EnheRedesignHero";
import { EnheRedesignProductShowcase } from "./EnheRedesignProductShowcase";

export function EnheRedesignHome({
  locale,
  featuredComments = []
}: {
  locale: RedesignLocale;
  featuredComments?: readonly HomepageCommentCard[];
}) {
  return (
    <main className="redesign-home-page" data-locale={locale}>
      <EnheRedesignHero locale={locale} />
      <EnheRedesignFeatures locale={locale} />
      <EnheRedesignProductShowcase locale={locale} />
      <EnheRedesignExperienceReviews locale={locale} featuredComments={featuredComments} />
    </main>
  );
}
