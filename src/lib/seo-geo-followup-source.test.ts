import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SEO and GEO follow-up source contracts", () => {
  it("keeps homepage CTA buttons as readable transparent glass without changing SEO or GEO copy", () => {
    const css = read("src/app/globals.css");
    const baseCta = css.match(/\.home-hero-cta\s*\{[\s\S]*?\}/)?.[0] ?? "";
    const accentCta = css.match(/\.home-hero-cta-accent\s*\{[\s\S]*?\}/)?.[0] ?? "";

    expect(baseCta).toContain("background-color: transparent !important");
    expect(baseCta).toContain("background-image: none !important");
    expect(baseCta).toContain("backdrop-filter: var(--home-hero-cta-filter) !important");
    expect(accentCta).toContain("background: transparent");
    expect(accentCta).toContain("color: #ffffff");
    expect(accentCta).not.toContain("radial-gradient");
    expect(accentCta).not.toContain("linear-gradient");
    expect(accentCta).not.toContain("background: var(--marketing-accent)");
    expect(accentCta).not.toContain("background-color: rgba(240, 90, 53, 0.94)");
    expect(accentCta).not.toContain("color: #211410");
  });

  it("adds public cache headers for AI Trends canonical listing pages", () => {
    const nextConfig = read("next.config.ts");

    expect(nextConfig).toContain('source: "/ai-trends"');
    expect(nextConfig).toContain('source: "/en/ai-trends"');
  });

  it("replaces public tool-detail empty placeholders with useful evergreen guidance", () => {
    const detail = read("src/app/tools/[slug]/page-shell.tsx");

    expect(detail).toContain("publicChangelogFallback");
    expect(detail).toContain("publicDemoVideoFallback");
    expect(detail).toContain("publicFaqFallback");
    expect(detail).not.toContain("{td.noChangelogs}");
    expect(detail).not.toContain("{td.demoVideoFallback}");
    expect(detail).not.toContain("{td.noFaqs}");
  });

  it("enriches the Chinese skill-learning listing page with GEO answer blocks and internal links", () => {
    const skillLearning = read("src/app/skill-learning/page-shell.tsx");

    expect(skillLearning).toContain("skillLearningGeoSections");
    expect(skillLearning).toContain("AI技能学习路径");
    expect(skillLearning).toContain("适合谁学习");
    expect(skillLearning).toContain("如何把课程转化为工作成果");
    expect(skillLearning).toContain('buildLocalePath("/ai-news", forceLocale)');
    expect(skillLearning).toContain('buildLocalePath("/software", forceLocale)');
    expect(skillLearning).toContain('buildLocalePath("/account-services", forceLocale)');
  });

  it("documents the first-stage GEO implementation rules for future content work", () => {
    const guide = read("docs/geo-implementation-plan.md");

    expect(guide).toContain("GEO");
    expect(guide).toContain("AI Overviews");
    expect(guide).toContain("答案式区块");
    expect(guide).toContain("内部链接");
  });
});
