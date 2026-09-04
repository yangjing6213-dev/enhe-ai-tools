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

describe("AI trend briefing source contracts", () => {
  it("adds public AI trend topic and daily briefing routes", () => {
    expect(exists("src/app/ai-trends/page-shell.tsx")).toBe(true);
    expect(exists("src/app/ai-trends/daily/page-shell.tsx")).toBe(true);
    expect(exists("src/app/ai-trends/daily/[date]/page-shell.tsx")).toBe(true);
    expect(exists("src/app/(zh-public)/ai-trends/page.tsx")).toBe(true);
    expect(exists("src/app/(zh-public)/ai-trends/daily/page.tsx")).toBe(true);
    expect(exists("src/app/(zh-public)/ai-trends/daily/[date]/page.tsx")).toBe(true);
    expect(exists("src/app/en/ai-trends/page.tsx")).toBe(true);
    expect(exists("src/app/en/ai-trends/daily/page.tsx")).toBe(true);
    expect(exists("src/app/en/ai-trends/daily/[date]/page.tsx")).toBe(true);
  });

  it("keeps only the evergreen topic page indexable in sitemap", () => {
    const sitemap = read("src/app/sitemap.ts");
    const robots = read("src/app/robots.ts");
    const topicPage = read("src/app/ai-trends/page-shell.tsx");

    expect(sitemap).toContain('"/ai-trends"');
    expect(sitemap).not.toContain('"/ai-trends/daily"');
    expect(sitemap).not.toContain('`/ai-trends/daily/');
    expect(robots).not.toContain("/ai-trends/daily");
    expect(topicPage).toContain("buildLanguageAlternates(topicPath)");
    expect(topicPage).toContain("buildMetaDescription(copy.description, undefined, 150)");
  });

  it("sets noindex follow metadata on daily archive and daily detail pages", () => {
    const archiveShell = read("src/app/ai-trends/daily/page-shell.tsx");
    const detailShell = read("src/app/ai-trends/daily/[date]/page-shell.tsx");

    expect(archiveShell).toContain("generateAiTrendDailyArchiveMetadata");
    expect(archiveShell).toContain("index: false");
    expect(archiveShell).toContain("follow: true");
    expect(detailShell).toContain("generateAiTrendDailyDetailMetadata");
    expect(detailShell).toContain("index: false");
    expect(detailShell).toContain("follow: true");
  });

  it("gates full daily HTML behind login without exposing it in the public branch", () => {
    const detailShell = read("src/app/ai-trends/daily/[date]/page-shell.tsx");

    expect(detailShell).toContain("getCurrentUser");
    expect(detailShell).toContain("const isLoggedIn = Boolean(user)");
    expect(detailShell).toContain("toAiTrendBriefingView(briefing, isLoggedIn)");
    expect(detailShell).toContain("buildAiTrendLoginUrl(date, forceLocale)");
    expect(detailShell).toContain("buildAiTrendReportSrcDoc");
    expect(detailShell).toContain("sandbox=");
    expect(detailShell).toContain("view.fullHtml");
  });


  it("renders structured demand breakdowns on topic, archive, and detail pages", () => {
    const topicPage = read("src/app/ai-trends/page-shell.tsx");
    const archiveShell = read("src/app/ai-trends/daily/page-shell.tsx");
    const detailShell = read("src/app/ai-trends/daily/[date]/page-shell.tsx");

    expect(topicPage).toContain("workProductivityScenarioRanking");
    expect(topicPage).toContain("copy.scenarioTitle");
    expect(archiveShell).toContain("briefing.demandBreakdowns");
    expect(archiveShell).toContain("scenario.developmentPriority");
    expect(detailShell).toContain("view.demandBreakdowns");
    expect(detailShell).toContain("scenario.productOpportunity");
    expect(detailShell).toContain("scenario.aiValue");
  });
  it("adds the publishing script for automation upserts", () => {
    expect(exists("scripts/publish-ai-trend-briefing-html.ts")).toBe(true);
    expect(exists("scripts/publish-ai-trend-briefing-html.test.ts")).toBe(true);
  });

  it("keeps the topic hero focused without an extra top label above the demand heat section", () => {
    const topicPage = read("src/app/ai-trends/page-shell.tsx");
    const heroStart = topicPage.indexOf("<section className=\"surface-panel overflow-hidden");
    const heroEnd = topicPage.indexOf("<section className=\"mt-12\">", heroStart);
    const demandSection = topicPage.slice(heroEnd, topicPage.indexOf("<section className=\"mt-12\">", heroEnd + 1));

    expect(topicPage).not.toContain("demandDirections.slice(0, 5)");
    expect(topicPage.slice(heroStart, heroEnd)).not.toContain("item.heat");
    expect(demandSection).not.toContain(">TOP</Badge>");
    expect(demandSection).toContain("copy.demandTitle");
  });
});
