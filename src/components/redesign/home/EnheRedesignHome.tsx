import type { RedesignLocale } from "@/components/redesign/types";
import { EnheRedesignBrandValue } from "./EnheRedesignBrandValue";
import { EnheRedesignExperienceReviews } from "./EnheRedesignExperienceReviews";
import { EnheRedesignHero } from "./EnheRedesignHero";
import { EnheRedesignProductShowcase } from "./EnheRedesignProductShowcase";

export function EnheRedesignHome({ locale }: { locale: RedesignLocale }) {
  return (
    <main className="redesign-home-page" data-locale={locale}>
      <EnheRedesignHero locale={locale} />
      <EnheRedesignProductShowcase locale={locale} />
      <EnheRedesignExperienceReviews locale={locale} />
      <EnheRedesignBrandValue locale={locale} />
    </main>
  );
}
