import type { RedesignLocale } from "@/components/redesign/types";
import { EnheRedesignExperienceReviews } from "./EnheRedesignExperienceReviews";
import { EnheRedesignFeatures } from "./EnheRedesignFeatures";
import { EnheRedesignHero } from "./EnheRedesignHero";
import { EnheRedesignProductShowcase } from "./EnheRedesignProductShowcase";

export function EnheRedesignHome({ locale }: { locale: RedesignLocale }) {
  return (
    <main className="redesign-home-page" data-locale={locale}>
      <EnheRedesignHero locale={locale} />
      <EnheRedesignFeatures locale={locale} />
      <EnheRedesignProductShowcase locale={locale} />
      <EnheRedesignExperienceReviews locale={locale} />
    </main>
  );
}
