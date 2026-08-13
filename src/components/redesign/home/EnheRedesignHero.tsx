import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import type { RedesignLocale } from "@/components/redesign/types";

export function EnheRedesignHero({ locale }: { locale: RedesignLocale }) {
  const copy = HOME_COPY[locale];

  return (
    <section className="redesign-home redesign-home-hero" data-locale={locale} aria-labelledby={`redesign-home-title-${locale}`}>
      <div className="redesign-home-hero-inner">
        <span className="redesign-home-mobile-label">{copy.label}</span>
        <h1 id={`redesign-home-title-${locale}`}>{copy.h1}</h1>
        <p className="redesign-home-subtitle">{copy.subtitle}</p>
        <a className="redesign-home-cta" href={copy.cta.href}>
          {copy.cta.label}
        </a>
      </div>
    </section>
  );
}
