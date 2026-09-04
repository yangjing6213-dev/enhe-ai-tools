import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path: string) {
  return existsSync(join(root, path));
}

describe("AI GEO foundations", () => {
  it("ships agent-readable discovery files for AI search systems", () => {
    expect(exists("public/llms.txt")).toBe(true);
    expect(exists("public/pricing.md")).toBe(true);
    expect(exists("public/okf/index.md")).toBe(true);
    expect(exists("public/okf/enhe-ai-overview.md")).toBe(true);

    const llms = read("public/llms.txt");
    expect(llms).toContain("ENHE AI");
    expect(llms).toContain("https://www.enhe-tech.com.cn/ai-news");
    expect(llms).toContain("https://www.enhe-tech.com.cn/okf/index.md");
    expect(llms).toContain("AI agent tools recommendation");
    expect(llms).toContain("AI account service compliance guidance");

    const pricing = read("public/pricing.md");
    expect(pricing).toContain("AI software apps");
    expect(pricing).toContain("AI account service guidance");
    expect(pricing).toContain("AI skill courses");

    const okfIndex = read("public/okf/index.md");
    expect(okfIndex).toContain("type: KnowledgeBundle");
    expect(okfIndex).toContain("[ENHE AI overview](./enhe-ai-overview.md)");
    expect(okfIndex).toContain("GEO Query Coverage");
    expect(okfIndex).toContain("Content-to-Action Map");

    const softwareOkf = read("public/okf/software/index.md");
    expect(softwareOkf).toContain("AI Agent Tool Recommendation Answer");
    expect(softwareOkf).toContain("Recommendation Dimensions");
    expect(softwareOkf).toContain("FAQ For Answer Engines");
    expect(softwareOkf).toContain("Source And Schema Notes");
    expect(softwareOkf).toContain("https://schema.org/FAQPage");
  });

  it("allows AI answer-engine crawlers while keeping private surfaces blocked", () => {
    const robots = read("src/app/robots.ts");

    for (const bot of [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "PerplexityBot",
      "ClaudeBot",
      "anthropic-ai",
      "Googlebot",
      "GoogleOther",
      "Google-Extended",
      "Bingbot",
      "Applebot",
      "Baiduspider",
      "Bytespider",
      "Doubaobot",
    ]) {
      expect(robots).toContain(`"${bot}"`);
    }

    expect(robots).toContain('allow: ["/"]');
    for (const privatePath of ["/admin", "/dashboard", "/user-center", "/checkout", "/orders", "/payment", "/api"]) {
      expect(robots).toContain(`"${privatePath}"`);
    }
  });

  it("adds answer-style GEO sections and internal links to core listing pages", () => {
    const software = read("src/app/software/page-shell.tsx");
    const accountServices = read("src/app/account-services/page-shell.tsx");
    const aiNews = read("src/app/ai-news/page-shell.tsx");
    const aiTrends = read("src/app/ai-trends/page-shell.tsx");
    const skillLearning = read("src/app/skill-learning/page-shell.tsx");

    expect(software).toContain("softwareGeoSections");
    expect(software).toContain("softwareAnswerBlock");
    expect(software).toContain("softwareFaqItems");
    expect(software).toContain("softwareComparisonRows");
    expect(software).toContain("softwareSourceLinks");
    expect(software).toContain("buildSoftwareCollectionSchema");
    expect(software).toContain("buildFaqSchema");
    expect(software).toContain("AI智能体工具推荐");
    expect(software).toContain('"@type": "ItemList"');
    expect(software).toContain("citation:");
    expect(software).toContain("如何选择AI软件应用");
    expect(software).toContain(
      'buildLocalePath("/skill-learning", forceLocale)',
    );
    expect(software).toContain('buildLocalePath("/ai-news", forceLocale)');

    expect(accountServices).toContain("accountServicesGeoSections");
    expect(accountServices).toContain("AI账号服务如何合规使用");
    expect(accountServices).toContain(
      'buildLocalePath("/software", forceLocale)',
    );
    expect(accountServices).toContain(
      'buildLocalePath("/skill-learning", forceLocale)',
    );

    expect(aiNews).toContain("aiNewsGeoSections");
    expect(aiNews).toContain("AI资讯对用户有什么用");
    expect(aiNews).toContain('buildLocalePath("/ai-trends", forceLocale)');
    expect(aiNews).toContain('buildLocalePath("/software", forceLocale)');

    expect(aiTrends).toContain("aiTrendsGeoSections");
    expect(aiTrends).toContain("如何用趋势判断下一步行动");
    expect(aiTrends).toContain('buildLocalePath("/ai-news", forceLocale)');
    expect(aiTrends).toContain(
      'buildLocalePath("/skill-learning", forceLocale)',
    );

    expect(skillLearning).toContain("skillLearningOutcomeSections");
    expect(skillLearning).toContain("skillLearningFaqItems");
    expect(skillLearning).toContain("buildFaqSchema");
    expect(skillLearning).toContain("From AI skills to repeatable workflows");
  });

  it("keeps machine-readable GEO files publicly cached but out of the main search sitemap", () => {
    const sitemap = read("src/app/sitemap.ts");
    const nextConfig = read("next.config.ts");

    for (const path of [
      "/llms.txt",
      "/pricing.md",
      "/okf/index.md",
      "/okf/enhe-ai-overview.md",
    ]) {
      expect(sitemap).not.toContain(`"${path}"`);
      expect(nextConfig).toContain(`source: "${path}"`);
    }

    expect(sitemap).toContain('"/en/ai-trends"');
  });
});
