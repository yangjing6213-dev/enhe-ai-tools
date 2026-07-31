import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SEO insights admin wiring", () => {
  it("adds SEO insights to the admin navigation and page tree", () => {
    const layout = readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../app/admin/seo-insights/page.tsx", import.meta.url), "utf8");
    const dictionary = readFileSync(new URL("./admin-i18n.ts", import.meta.url), "utf8");

    expect(layout).toContain('["seoInsights", "/admin/seo-insights"]');
    expect(dictionary).toContain("seoInsights");
    expect(page).toContain("buildSeoInsightReport");
    expect(page).toContain("SEO 数据跟踪与行动建议");
    expect(page).toContain("seoConversionFunnelSteps");
    expect(page).toContain("搜索到转化会话归因");
    expect(page).toContain("匿名浏览器会话");
    expect(page).toContain("SEO_ATTRIBUTION_WINDOW_DAYS");
    expect(page).toContain("SEO_INSIGHTS_EVENT_BATCH_SIZE");
    expect(page).toContain("loadSeoInsightEvents");
    expect(page).toContain("cursor: { id: cursor }");
    expect(page).toContain("不截断 landing 与后续转化链路");
    expect(page).toContain("内容落地路径");
    expect(page).toContain("产品页直达路径");
    expect(page).toContain("report.conversionFunnels.content");
    expect(page).toContain("report.conversionFunnels.direct");
    expect(page).toContain("不推算或展示收入金额");
    expect(page).not.toContain("eventLimitReached");
  });

  it("tracks SEO landing views from the global analytics tracker", () => {
    const tracker = readFileSync(new URL("../components/analytics-tracker.tsx", import.meta.url), "utf8");
    const analytics = readFileSync(new URL("./analytics.ts", import.meta.url), "utf8");

    expect(analytics).toContain('"seo_landing_view"');
    expect(tracker).toContain('eventName: "seo_landing_view"');
    expect(tracker).toContain("getSeoLandingMetadata");
    expect(tracker).toContain("trafficMedium");
    expect(tracker).toContain("sessionStorage");
    expect(tracker).toContain("enhe_analytics_attribution");
    expect(tracker).toContain("ANALYTICS_SESSION_IDLE_TIMEOUT_MS");
    expect(tracker).toContain("lastSeenAt");
  });
});
