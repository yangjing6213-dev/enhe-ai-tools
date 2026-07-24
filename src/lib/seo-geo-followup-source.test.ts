import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SEO and GEO follow-up source contracts", () => {
  it("keeps semantic hero and task schema after removing duplicate CTAs", () => {
    const page = read("src/app/page-shell.tsx");
    const css = read("src/app/globals.css");

    expect(page).toContain('<h1 className="sr-only">{heroTitle}</h1>');
    expect(page).toContain("taskCollectionSchema, taskItemListSchema");
    expect(page).toContain('className="home-task-outcomes-shell"');
    expect(page).not.toContain('className="home-hero-actions"');
    expect(css).not.toContain(".home-hero-actions {");
    expect(css).toContain("padding: clamp(2.2rem, 5.8vh, 4.8rem) 0;");
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
    expect(skillLearning).toContain("先选择未来机会方向");
    expect(skillLearning).toContain("再确认真实价值");
    expect(skillLearning).toContain("沉淀为长期资产");
    expect(skillLearning).toContain('buildLocalePath("/ai-news", forceLocale)');
    expect(skillLearning).toContain('buildLocalePath("/software", forceLocale)');
    expect(skillLearning).toContain('buildLocalePath("/account-services", forceLocale)');
  });

  it("keeps skill-learning outcome and FAQ sections below the product cards", () => {
    const skillLearning = read("src/app/skill-learning/page-shell.tsx");
    const toolCardIndex = skillLearning.indexOf("<ToolCard key={tool.id}");
    const outcomeIndex = skillLearning.indexOf(
      "<SkillLearningOutcomeBlock forceLocale={forceLocale} />",
    );

    expect(toolCardIndex).toBeGreaterThan(-1);
    expect(outcomeIndex).toBeGreaterThan(toolCardIndex);
  });

  it("documents the first-stage GEO implementation rules for future content work", () => {
    const guide = read("docs/geo-implementation-plan.md");

    expect(guide).toContain("GEO");
    expect(guide).toContain("AI Overviews");
    expect(guide).toContain("答案式区块");
    expect(guide).toContain("内部链接");
  });
});
