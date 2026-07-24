import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage hero conversion contract", () => {
  it("keeps semantic hero copy while removing duplicate task actions", () => {
    const source = readFileSync(
      new URL("../app/page-shell.tsx", import.meta.url),
      "utf8",
    );
    const heroStart = source.indexOf('<section className="home-hero-shell">');
    const hero = source.slice(
      heroStart,
      source.indexOf("</section>", heroStart) + "</section>".length,
    );

    expect(hero).toContain('<h1 className="sr-only">{heroTitle}</h1>');
    expect(hero).toContain('<ASCIIHeroTitle text={heroTitle} />');
    expect(hero).toContain('<p className="home-hero-positioning">');
    expect(hero).toContain(
      "<HeroGradientSubtitle>{heroIntro}</HeroGradientSubtitle>",
    );
    expect(hero).not.toContain("<ButtonLink");
    expect(hero).not.toContain("<BorderGlow");
    expect(hero).not.toContain('className="home-hero-actions"');
    expect(hero).not.toContain('data-analytics-meta-placement="home-hero"');

    expect(source).toContain('className="home-task-outcomes-shell"');
    expect(source).toContain('href: "/product-paths/work-efficiency"');
    expect(source).toContain('href: "/product-paths/media-generation"');
    expect(source).toContain('href: "/skill-learning"');
    expect(source).toContain('href: "/ai-news"');
    expect(source).toContain("taskCollectionSchema, taskItemListSchema");
    expect(source).not.toContain("taskEyebrow");
    expect(source).not.toContain("home-flowing-menu-shell");
  });

  it("groups the verification, workflow, and final CTA above the support disclosure", () => {
    const source = readFileSync(
      new URL("../app/page-shell.tsx", import.meta.url),
      "utf8",
    );
    const decisionStart = source.indexOf('className="home-decision-card-shell"');
    const supportStart = source.indexOf('className="home-support-shell"');
    const decisionCard = source.slice(decisionStart, supportStart);

    expect(decisionStart).toBeGreaterThan(-1);
    expect(supportStart).toBeGreaterThan(decisionStart);
    expect(decisionCard).toContain(
      'className="home-seo-disclosure home-decision-disclosure"',
    );
    expect(decisionCard).toContain(
      '<summary id="home-decision-summary">{conversionCopy.finalTitle}</summary>',
    );
    expect(decisionCard).toContain('className="home-decision-card"');
    expect(decisionCard).toContain('className="home-trust-list"');
    expect(decisionCard).toContain('className="home-workflow-list"');
    expect(decisionCard).toContain('className="home-final-cta-band"');
    expect(source.match(/id="home-trust-title"/g)).toHaveLength(1);
    expect(source.match(/id="home-workflow-title"/g)).toHaveLength(1);
    expect(source).not.toContain('id="home-final-cta-title"');
  });

  it("keeps the next-section preview while centering hero content", () => {
    const css = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(css).toContain(
      "--home-next-section-peek: clamp(4.5rem, 7vh, 5rem);",
    );
    expect(css).toContain(
      "min-height: calc(100dvh - var(--home-next-section-peek));",
    );
    expect(css).toContain(
      "min-height: calc(100dvh - 72px - clamp(2.5rem, 6vh, 5rem) - var(--home-next-section-peek));",
    );
    expect(css).toContain(
      "min-height: calc(100dvh - 68px - var(--home-next-section-peek));",
    );
    expect(css).toContain(
      "@media (min-width: 769px) and (max-height: 800px)",
    );
    expect(css).toContain(
      "min-height: calc(100dvh - 64px - 1rem - var(--home-next-section-peek));",
    );
    expect(css).toContain("padding: clamp(2.2rem, 5.8vh, 4.8rem) 0;");
    expect(css).toContain("padding: 1rem 0;");
    expect(css).toContain("padding: 1.5rem 0;");
    expect(css).not.toContain(".home-hero-actions {");
  });
});
