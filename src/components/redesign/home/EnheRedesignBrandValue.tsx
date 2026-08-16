import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import type { RedesignLocale } from "@/components/redesign/types";

export function EnheRedesignBrandValue({ locale }: { locale: RedesignLocale }) {
  const copy = HOME_COPY[locale];

  return (
    <section
      className="redesign-home redesign-home-brand-value"
      data-locale={locale}
      aria-labelledby={`redesign-home-brand-value-title-${locale}`}
    >
      <div className="redesign-home-brand-value-inner">
        <h2 id={`redesign-home-brand-value-title-${locale}`}>{copy.value.heading}</h2>
        <a
          className="redesign-home-brand-value-cta"
          data-support-exclusion="home-brand-cta"
          href={copy.value.cta.href}
        >
          {copy.value.cta.label}
        </a>
      </div>
    </section>
  );
}
