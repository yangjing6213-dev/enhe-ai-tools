import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function summaryBlocks(source: string) {
  return Array.from(source.matchAll(/<summary>[\s\S]*?<\/summary>/g)).map(
    (match) => match[0],
  );
}

describe("P0 and P1 SEO/GEO optimization contracts", () => {
  it("keeps one compact user-first answer visible before filters on core commercial pages", () => {
    const softwareCatalog = read(
      "src/components/redesign/software/EnheRedesignSoftwareCatalog.tsx",
    );
    const softwareCopy = read("src/lib/redesign/software/software-copy.ts");
    const pages = [
      {
        source: read("src/app/account-services/page-shell.tsx"),
        component: "<AccountServicesUserAnswerCard forceLocale={forceLocale} />",
        before: "<ListingGuidanceFold forceLocale={forceLocale} />",
      },
      {
        source: read("src/app/skill-learning/page-shell.tsx"),
        component: "<SkillLearningUserAnswerCard forceLocale={forceLocale} />",
        before: "<ListingDecisionStrip forceLocale={forceLocale} />",
      },
      {
        source: read("src/app/pricing/page-shell.tsx"),
        component: "<PricingBuyerAnswerCard copy={copy} />",
        before: 'className="mt-8 grid gap-4 lg:grid-cols-2"',
      },
    ];

    for (const page of pages) {
      expect(page.source).toContain(page.component);
      expect(page.source.indexOf(page.component)).toBeGreaterThan(-1);
      expect(page.source.indexOf(page.component)).toBeLessThan(
        page.source.indexOf(page.before),
      );
    }

    expect(softwareCatalog).toContain("copy.page.intro");
    expect(softwareCatalog.indexOf("copy.page.intro")).toBeLessThan(
      softwareCatalog.indexOf("<EnheRedesignSoftwareCategorySelector"),
    );
    expect(softwareCopy).toContain(
      "按真实任务找到已公开的 ENHE AI 工具、课程和效率入口",
    );
    expect(softwareCopy).toContain(
      "Find public ENHE AI tools, courses, and a free audit by task",
    );
  });

  it("keeps folded summaries out of the heading tree to reduce rendered structure noise", () => {
    for (const path of [
      "src/app/software/page-shell.tsx",
      "src/app/account-services/page-shell.tsx",
      "src/app/skill-learning/page-shell.tsx",
      "src/app/pricing/page-shell.tsx",
    ]) {
      for (const block of summaryBlocks(read(path))) {
        expect(block).not.toMatch(/<h[23]\b/);
      }
    }
  });

  it("strengthens agent-readable Chinese citation guidance without adding page clutter", () => {
    const llms = read("public/llms.txt");
    const overviewOkf = read("public/okf/enhe-ai-overview.md");
    const softwareOkf = read("public/okf/software/index.md");
    const accountOkf = read("public/okf/account-services/index.md");
    const skillOkf = read("public/okf/skill-learning/index.md");

    expect(llms).toContain("中文AI平台引用建议");
    expect(llms).toContain("普通AI用户常见问法");
    expect(llms).toContain("中国普通AI用户");

    expect(overviewOkf).toContain("Chinese Aliases And User Questions");
    expect(overviewOkf).toContain("普通AI用户");
    expect(softwareOkf).toContain("Chinese Query Targets");
    expect(accountOkf).toContain("Chinese Query Targets");
    expect(skillOkf).toContain("Chinese Query Targets");
  });
});
