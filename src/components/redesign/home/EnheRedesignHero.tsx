import { HOME_COPY } from "@/lib/redesign/home/home-copy";
import type { RedesignLocale } from "@/components/redesign/types";
import MaskedHeading from "@/components/MaskedHeading";
import StarBorder from "@/components/StarBorder";
import { ArrowRight, Newspaper, UsersRound, Wrench } from "lucide-react";

export function EnheRedesignHero({ locale }: { locale: RedesignLocale }) {
  const copy = HOME_COPY[locale];
  const titleBreak = copy.h1.indexOf(" ");
  const titleLines = locale === "zh" && titleBreak >= 0
    ? [copy.h1.slice(0, titleBreak), copy.h1.slice(titleBreak + 1)]
    : copy.h1.split(/(?<=\.) /);
  const mobileCards = locale === "zh" ? [
    { href: copy.cta.href, title: "探索工具", description: "找到适合当前任务的 AI 工具", Icon: Wrench },
    { href: copy.forumCta.href, title: "进入社区", description: "分享经验，与创作者交流", Icon: UsersRound },
    { href: "/ai-news", title: "跟进资讯", description: "了解 AI 产品与行业动态", Icon: Newspaper },
  ] : [
    { href: copy.cta.href, title: "Build with AI", description: "Find tools for your next task.", Icon: Wrench },
    { href: copy.forumCta.href, title: "Grow together", description: "Share ideas with the community.", Icon: UsersRound },
    { href: "/en/ai-news", title: "Stay informed", description: "Follow AI products and industry updates.", Icon: Newspaper },
  ];

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
              initialFallback={false}
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
          <span className="redesign-home-mobile-title" aria-hidden="true">
            {titleLines.map((line, index) => <span key={`mobile-${index}`}>{line}</span>)}
          </span>
        </h1>
        <p className="redesign-home-subtitle">{copy.subtitle}</p>
        <div className="redesign-home-cta-row">
          {[copy.cta, copy.forumCta, copy.groupChatCta].map((cta) => (
            <StarBorder
              key={cta.href}
              as="a"
              className="redesign-home-cta"
              href={cta.href}
              data-analytics-event="home_entry_click"
              data-analytics-meta-surface="hero"
              data-analytics-meta-target={cta === copy.cta ? "tools" : cta === copy.forumCta ? "forum" : "group-chat"}
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
        <span className="redesign-home-mobile-mascot" aria-hidden="true" />
      </div>
      <nav className="redesign-home-mobile-cards" aria-label={locale === "en" ? "Explore ENHE AI" : "探索 ENHE AI"}>
        {mobileCards.map(({ href, title, description, Icon }) => <a className="redesign-home-mobile-card" key={href} href={href}>
          <span className="redesign-home-mobile-card-icon"><Icon aria-hidden="true" size={25} strokeWidth={2.2} /></span>
          <span className="redesign-home-mobile-card-copy"><strong>{title}</strong><span>{description}</span></span>
          <ArrowRight aria-hidden="true" className="redesign-home-mobile-card-arrow" size={21} />
        </a>)}
      </nav>
    </section>
  );
}
