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
  });

  it("tracks SEO landing views from the global analytics tracker", () => {
    const tracker = readFileSync(new URL("../components/analytics-tracker.tsx", import.meta.url), "utf8");
    const analytics = readFileSync(new URL("./analytics.ts", import.meta.url), "utf8");

    expect(analytics).toContain('"seo_landing_view"');
    expect(tracker).toContain('eventName: "seo_landing_view"');
    expect(tracker).toContain("getSeoLandingMetadata");
    expect(tracker).toContain("trafficMedium");
  });
});
