import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import type { RedesignLocale } from "@/components/redesign/types";
import MaskedHeading from "@/components/MaskedHeading";

export function EnheRedesignHero({ locale }: { locale: RedesignLocale }) {
  const copy = HOME_COPY[locale];
  const titleBreak = copy.h1.indexOf(" ");
  const titleLines = locale === "zh" && titleBreak >= 0
    ? [copy.h1.slice(0, titleBreak), copy.h1.slice(titleBreak + 1)]
    : [copy.h1];

  return (
    <section className="redesign-home redesign-home-hero" data-locale={locale} aria-labelledby={`redesign-home-title-${locale}`}>
      <div className="redesign-home-hero-inner">
        <h1 id={`redesign-home-title-${locale}`} aria-label={copy.h1}>
          {titleLines.map((line, index) => (
            <MaskedHeading
              key={`${index}-${line}`}
              tag="span"
              className="redesign-home-animated-line"
              text={line}
              src="/redesign/home/blue-energy-city.webp"
              fillScale={1.25}
              parallax={26}
              drift={18}
              brightness={1}
              saturation={1}
              grayscale={false}
              reveal="rise"
              trigger="view"
              duration={1.1}
              stagger={0.09}
              align="center"
              weight={800}
              tracking={-0.03}
              lineHeight={1.06}
              textScale={locale === "zh" ? 0.105 : 0.08}
            />
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
