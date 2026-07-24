import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n";

describe("home AI news label contracts", () => {
  it("uses the concise AI news naming in the primary navigation", () => {
    expect(dictionaries.zh.nav.aiNews).toBe("AI资讯");
    expect(dictionaries.zh.home.aiNewsButton).toBe("AI前沿资讯");
    expect(dictionaries.zh.aiNews.title).toBe("AI前沿资讯与趋势洞察");
  });

  it("keeps AI news discoverable from the simplified homepage support links", () => {
    const page = readFileSync(new URL("../app/page-shell.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");

    expect(page).toContain("homeSupportLinks");
    expect(page).toContain('label: "AI 前沿资讯", href: "/ai-news"');
    expect(page).toContain('label: "AI News", href: "/ai-news"');
    expect(page).toContain('href={buildLocalePath(item.href, forceLocale)}');
    expect(page).toContain('className="home-support-link"');
    expect(page).toContain('href={buildLocalePath("/software", forceLocale)}');
    expect(page).toContain('href={buildLocalePath("/skill-learning", forceLocale)}');
    expect(page).toContain('forceLocale === "en" ? "Explore practical AI learning" : "查看 AI 实战学习路径"');
    expect(page).toContain('forceLocale === "en" ? "Find the right AI tool" : "选择适合AI的工具"');
    expect(page).toContain('data-analytics-event="home_practical_ai_learning_click"');
    expect(page).toContain('data-analytics-event="home_tool_finder_cta_click"');
    expect(page.indexOf('href={buildLocalePath("/software", forceLocale)}')).toBeLessThan(
      page.indexOf('href={buildLocalePath("/skill-learning", forceLocale)}')
    );
    expect(page.indexOf('data-analytics-event="home_tool_finder_cta_click"')).toBeLessThan(
      page.indexOf('data-analytics-event="home_practical_ai_learning_click"')
    );
    expect(page).not.toContain("HomeGooeyNav");
  });
});
