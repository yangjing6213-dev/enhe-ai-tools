import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isClientAnalyticsEventName } from "@/lib/analytics";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("search growth analytics triggers", () => {
  it("tracks product CTA, checkout, and download actions without replacing view_tool", () => {
    const source = read("../app/tools/[slug]/page-shell.tsx");
    const tracker = read("../components/analytics-tracker.tsx");

    expect(source).toContain('data-analytics-event="product_use_cta_click"');
    expect(source).toContain('data-analytics-event="begin_checkout"');
    expect(source).toContain('data-analytics-event="product_download_click"');
    expect(source).toMatch(/<FormSubmitButton[\s\S]*?data-analytics-event="product_purchase_cta_click"/);
    expect(source).toMatch(/<ButtonLink[\s\S]*?data-analytics-event=\{softwareDownloadCtaEvent\}/);
    expect(tracker).toContain('return "view_tool"');
  });

  it("tracks content links into product detail pages", () => {
    const newsSource = read("../app/ai-news/[slug]/page-shell.tsx");
    const guideSource = read("../app/tutorials/page-shell.tsx");

    expect(newsSource).toContain('data-analytics-event="content_to_product_click"');
    expect(newsSource).toContain('data-analytics-meta-source="ai-news"');
    expect(guideSource).toContain('data-analytics-event="content_to_product_click"');
    expect(guideSource).toContain('data-analytics-meta-source="tutorials"');
  });

  it("normalizes localized routes before assigning page-view events", () => {
    const tracker = read("../components/analytics-tracker.tsx");

    expect(tracker).toContain("normalizePublicPath(pathname ?? \"/\")");
    expect(tracker).toContain('replace(/^\\/en(?=\\/)/, "")');
  });

  it("reuses one anonymous landing attribution for later client events", () => {
    const tracker = read("../components/analytics-tracker.tsx");

    expect(tracker).toContain("getOrCreateSessionAttribution");
    expect(tracker).toContain("mergeAttributionMetadata");
    expect(tracker).toContain("sessionId");
    expect(tracker).toContain("landingId");
    expect(tracker).toContain("firstLandingPath");
  });

  it("tracks the homepage task and learning CTA clicks", () => {
    const home = read("../app/page-shell.tsx");

    expect(home).toContain('data-analytics-event="home_task_outcome_click"');
    expect(home).toContain('data-analytics-meta-target={item.id}');
    expect(home).toContain('data-analytics-event="home_practical_ai_learning_click"');
    expect(home).toContain('data-analytics-meta-target="skill-learning"');
  });

  it("keeps every literal and dynamic data analytics event in the client allowlist", () => {
    const sources = [
      "../app/ai-news/[slug]/page-shell.tsx",
      "../app/ai-news/page-shell.tsx",
      "../app/page-shell.tsx",
      "../app/tools/[slug]/page-shell.tsx",
      "../app/tutorials/page-shell.tsx",
      "../components/validation-ai-prompt-kit-page.tsx"
    ].map(read);
    const literalEvents = sources.flatMap((source) =>
      Array.from(source.matchAll(/data-analytics-event="([^"]+)"/g), (match) => match[1])
    );

    for (const eventName of [...literalEvents, "product_purchase_cta_click", "product_download_click"]) {
      expect(isClientAnalyticsEventName(eventName), eventName).toBe(true);
    }
  });

  it("does not label order and review events as revenue", () => {
    const insights = read("../lib/seo-insights.ts");
    const adminPage = read("../app/admin/seo-insights/page.tsx");

    expect(insights).not.toContain("RevenueFunnel");
    expect(adminPage).not.toContain("自然搜索到收益会话归因");
    expect(adminPage).not.toContain("收益页直达路径");
  });
});
