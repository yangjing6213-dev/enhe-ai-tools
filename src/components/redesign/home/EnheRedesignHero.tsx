import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import type { RedesignLocale } from "@/components/redesign/types";

export function EnheRedesignHero({ locale }: { locale: RedesignLocale }) {
  const copy = HOME_COPY[locale];
  const titleLines = locale === "zh" ? copy.h1.split(" ", 2) : [copy.h1];

  return (
    <section className="redesign-home redesign-home-hero" data-locale={locale} aria-labelledby={`redesign-home-title-${locale}`}>
      <div className="redesign-home-hero-inner">
        <h1 id={`redesign-home-title-${locale}`} aria-label={copy.h1}>
          {titleLines.map((line, index) => (
            <span key={`${index}-${line}`}>{line}</span>
          ))}
        </h1>
        <p className="redesign-home-subtitle">{copy.subtitle}</p>
        <a className="redesign-home-cta" href={copy.cta.href}>
          {copy.cta.label}
        </a>
      </div>
    </section>
  );
}
