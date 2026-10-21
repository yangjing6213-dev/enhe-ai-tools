import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import type { RedesignLocale } from "@/components/redesign/types";
import MaskedHeading from "@/components/MaskedHeading";
import StarBorder from "@/components/StarBorder";

export function EnheRedesignHero({ locale }: { locale: RedesignLocale }) {
  const copy = HOME_COPY[locale];
  const titleBreak = copy.h1.indexOf(" ");
  const titleLines = locale === "zh" && titleBreak >= 0
    ? [copy.h1.slice(0, titleBreak), copy.h1.slice(titleBreak + 1)]
    : copy.h1.split(/(?<=\.) /);

  return (
    <section className="redesign-home redesign-home-hero" data-locale={locale} aria-labelledby={`redesign-home-title-${locale}`}>
      <div className="redesign-home-hero-inner">
        <h1 id={`redesign-home-title-${locale}`} aria-label={copy.h1}>
          {titleLines.map((line, index) => (
            <MaskedHeading
              key={`${index}-${line}`}
              tag="span"
              className="redesign-home-animated-line"
              style={{ fontFamily: '"Microsoft YaHei", Arial, sans-serif' }}
              text={line}
              src="/redesign/home/blue-energy-city.webp"
              priority
              initialFallback
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
              textScale={locale === "zh" ? 0.105 : 0.065}
            />
          ))}
        </h1>
        <p className="redesign-home-subtitle">{copy.subtitle}</p>
        <div className="redesign-home-cta-row">
          {[copy.cta, copy.forumCta].map((cta) => (
            <StarBorder
              key={cta.href}
              as="a"
              className="redesign-home-cta"
              href={cta.href}
              color="#ffffff"
              trailColor="#ffffff"
              textColor="#ffffff"
              duration={4}
              direction="clockwise"
              stars={1}
              trailLength={0.3}
              thickness={1}
              radius={12}
              glow={0.6}
              hover="lap"
              sparkle={false}
              clickPulse
              theme="dark"
            >
              {cta.label}
            </StarBorder>
          ))}
        </div>
      </div>
    </section>
  );
}
