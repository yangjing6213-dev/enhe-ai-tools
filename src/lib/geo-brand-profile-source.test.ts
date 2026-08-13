import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function exists(path: string) {
  return existsSync(join(root, path));
}

function findLayoutFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findLayoutFiles(path);
    return entry.name === "layout.tsx" ? [path] : [];
  });
}

describe("GEO brand profile source contracts", () => {
  it("publishes an AI-readable brand profile page with FAQ and entity schema", () => {
    const about = read("src/app/about/page-shell.tsx");

    expect(exists("src/app/(zh-public)/about/page.tsx")).toBe(true);
    expect(exists("src/app/en/about/page.tsx")).toBe(true);
    expect(about).toContain("恩禾ENHE AI 是什么？");
    expect(about).toContain(
      "ENHE AI 帮助用户把 AI 用到真实任务里：更快完成工作、创作内容、整理资料、学习技能、解决工具选择和使用问题。在需要处理敏感素材、长期稳定流程或隐私边界时，提供更可控的AI工具和路径。",
    );
    expect(about).toContain("安全、隐私和稳定");
    expect(about).toContain("普通用户如何开始");
    expect(about).toContain("适合谁");
    expect(about).not.toContain(
      "围绕 AI智能体、本地部署AI应用、AI软件工具、AI账号服务",
    );
    expect(about).toContain("buildFaqSchema");
    expect(about).toContain('"@type": "AboutPage"');
    expect(about).toContain("enheOrganizationReference");
    expect(about).not.toContain("const organizationSchema =");
  });

  it("keeps footer legal and company details discoverable while linking to the brand profile", () => {
    const footer = read("src/components/site-footer.tsx");

    expect(footer).toContain("合规条款");
    expect(footer).toContain("公司信息");
    expect(footer).toContain('<details className="site-footer-disclosure">');
    expect(footer).not.toContain('<details className="site-footer-disclosure" open>');
    expect(footer).toContain('className="site-footer-company-list"');
    expect(footer).toContain('className="site-footer-company-row"');
    expect(footer).toContain('buildLocalePath("/about", locale)');
    expect(footer).toContain("恩禾ENHE AI 品牌档案");
  });

  it("removes the global ByteDance loader from every app layout", () => {
    const rootLayout = read("src/app/root-layout-shared.tsx");
    const layoutSources = findLayoutFiles(join(root, "src", "app")).map((path) =>
      readFileSync(path, "utf8"),
    );

    expect(rootLayout).not.toContain("ttzz-push-loader");
    expect(rootLayout).not.toContain("strategy=\"beforeInteractive\"");
    expect(rootLayout).not.toContain("lf1-cdn-tos.bytegoofy.com/goofy/ttzz/push.js");
    expect(rootLayout).not.toContain("el.id = \"ttzz\"");
    expect(rootLayout).not.toContain('from "next/script"');
    expect(rootLayout).toContain("<AnalyticsTracker />");
    expect(layoutSources.join("\n")).not.toContain("lf1-cdn-tos.bytegoofy.com/goofy/ttzz/push.js");
    expect(layoutSources.join("\n")).not.toContain("strategy=\"beforeInteractive\"");
  });

  it("states the homepage positioning from user needs while keeping GEO context secondary", () => {
    const homeShell = read("src/app/page-shell.tsx");
    const dictionaries = read("src/lib/dictionaries.ts");

    expect(homeShell).toContain("home-hero-positioning");
    expect(homeShell).toContain("buildBreadcrumbSchema");
    expect(homeShell).toContain(
      "<StructuredData data={[breadcrumbSchema, webPageSchema, taskCollectionSchema, taskItemListSchema]} />",
    );
    expect(homeShell).not.toContain("faqSchema");
    for (const term of ["面向中文用户", "AI 工具与技能学习平台", "AI工具", "本地部署AI应用", "AI智能体", "AI技能教程", "AI账号服务", "AI最新资讯", "AI趋势分析", "可执行成果"]) {
      expect(dictionaries).toContain(term);
    }
    expect(dictionaries).toContain("AI软件应用");
    expect(dictionaries).toContain("AI账号服务");
    expect(dictionaries).toContain("AI前沿资讯");
    expect(dictionaries).not.toContain("本地部署AI应用、AI智能体、AI技能教程、AI账号服务和 AI最新资讯");
  });

  it("adds clear 301 redirects for weak public slugs", () => {
    const nextConfig = read("next.config.ts");
    const slugs = read("src/lib/public-slugs.ts");
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");

    expect(nextConfig).toContain('source: "/ai-news/ai-2"');
    expect(nextConfig).toContain('destination: "/ai-news/tencent-cloud-efficiency-agent-tools"');
    expect(nextConfig).toContain('source: "/ai-news/ai-3"');
    expect(nextConfig).toContain('destination: "/ai-news/how-to-choose-ai-tool-website"');
    expect(nextConfig).toContain('source: "/ai-news/enhe-ai"');
    expect(nextConfig).toContain('destination: "/ai-news/enhe-ai-tool-station-user-guide"');
    expect(nextConfig).toContain('source: "/software/zfb"');
    expect(nextConfig).toContain('destination: "/software/zfb-transfer-link-qr-code-generator"');
    expect(nextConfig).toContain('source: "/skill-learning/ai-ai-ilo5a5"');
    expect(nextConfig).toContain('destination: "/skill-learning/ai-monetization-side-hustle-course"');
    expect(slugs).toContain("explicitToolCanonicalSlugs");
    expect(slugs).toContain("explicitAiNewsCanonicalSlugs");
    expect(toolDetail).toContain("const canonicalSlug = getCanonicalToolSlug(tool);");
    expect(toolDetail).not.toContain("const canonicalSlug = buildSeoFriendlySlug");
  });

  it("adds GEO article-template requirements to AI news detail pages", () => {
    const detail = read("src/app/ai-news/[slug]/page-shell.tsx");

    expect(detail).toContain("buildAiNewsFaqItems");
    expect(detail).toContain("FAQ");
    expect(detail).toContain("相关工具/教程");
    expect(detail).toContain("buildFaqSchema");
    expect(detail).toContain('buildLocalePath("/software", forceLocale)');
    expect(detail).toContain('buildLocalePath("/skill-learning", forceLocale)');
    expect(detail).toContain('buildLocalePath("/account-services", forceLocale)');
  });
});
