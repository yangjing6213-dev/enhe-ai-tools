import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage hero conversion contract", () => {
  it("uses one row of four task entry actions", () => {
    const source = readFileSync(
      new URL("../app/page-shell.tsx", import.meta.url),
      "utf8",
    );
    const heroStart = source.indexOf('<section className="home-hero-shell">');
    const hero = source.slice(
      heroStart,
      source.indexOf("</section>", heroStart) + "</section>".length,
    );

    expect(hero.match(/<ButtonLink/g)).toHaveLength(1);
    expect(hero.match(/<BorderGlow/g)).toHaveLength(1);
    expect(hero).toContain(
      'href={buildLocalePath("/software", forceLocale)}',
    );
    expect(hero).toContain(
      'forceLocale === "en" ? "Find the right AI tool" : "选择适合AI的工具"',
    );
    expect(hero).toContain('className="home-hero-actions"');
    expect(hero).toContain('className="home-hero-primary-glow"');
    expect(hero.match(/className="home-hero-route-cta"/g)).toHaveLength(2);
    expect(hero).toContain(
      'href={buildLocalePath("/product-paths/work-efficiency", forceLocale)}',
    );
    expect(hero).toContain(
      'forceLocale === "en" ? "Boost work efficiency" : "提升工作效率"',
    );
    expect(hero).toContain(
      'href={buildLocalePath("/product-paths/media-generation", forceLocale)}',
    );
    expect(hero).toContain(
      'forceLocale === "en" ? "Create content with AI" : "内容生成创作"',
    );
    expect(hero).toContain('className="home-hero-secondary-link"');
    expect(hero).toContain(
      'href={buildLocalePath("/skill-learning", forceLocale)}',
    );
    expect(hero).toContain(
      'forceLocale === "en" ? "Explore practical AI learning" : "查看 AI 实战学习路径"',
    );
    expect(hero.indexOf('href={buildLocalePath("/software", forceLocale)}')).toBeLessThan(
      hero.indexOf('href={buildLocalePath("/product-paths/work-efficiency", forceLocale)}'),
    );
    expect(hero.indexOf('href={buildLocalePath("/product-paths/work-efficiency", forceLocale)}')).toBeLessThan(
      hero.indexOf('href={buildLocalePath("/product-paths/media-generation", forceLocale)}'),
    );
    expect(hero.indexOf('href={buildLocalePath("/product-paths/media-generation", forceLocale)}')).toBeLessThan(
      hero.indexOf('href={buildLocalePath("/skill-learning", forceLocale)}'),
    );
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
    expect(decisionCard).toContain('className="home-seo-disclosure home-decision-disclosure"');
    expect(decisionCard).toContain('<summary id="home-decision-summary">{conversionCopy.finalTitle}</summary>');
    expect(decisionCard).toContain('className="home-decision-card"');
    expect(decisionCard).toContain('className="home-trust-list"');
    expect(decisionCard).toContain('className="home-workflow-list"');
    expect(decisionCard).toContain('className="home-final-cta-band"');
    expect(source.match(/id="home-trust-title"/g)).toHaveLength(1);
    expect(source.match(/id="home-workflow-title"/g)).toHaveLength(1);
    expect(source).not.toContain('id="home-final-cta-title"');
  });

  it("leaves a visible preview of the next homepage section", () => {
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
    expect(css).toContain(
      ".home-hero-actions {\n  display: grid;\n  width: min(100%, 1040px);\n  grid-template-columns: repeat(4, minmax(0, 1fr));",
    );
    expect(css).toContain(
      ".home-hero-primary-glow {\n  width: 100% !important;\n  min-width: 0 !important;",
    );
    expect(css).toContain(
      ".home-hero-actions {\n    width: 100%;\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
  });
});
