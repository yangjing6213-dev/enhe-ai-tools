import { describe, expect, it } from "vitest";
import { getPageViewEventName } from "@/lib/analytics-client";
import { buildSeoInsightReport, getSeoContentType, isSeoTrackablePath } from "@/lib/seo-insights";
import { getOrCreateSessionAttribution, type AnalyticsSessionStorage } from "@/components/analytics-tracker";

describe("public product analytics route coverage", () => {
  it.each([
    ["/ai-skills", "ai_skill_listing", "view_catalog"],
    ["/ai-skills/example", "ai_skill_detail", "view_tool"],
    ["/ai-workflows", "ai_workflow_listing", "view_catalog"],
    ["/ai-workflows/example", "ai_workflow_detail", "view_tool"],
    ["/software", "software_listing", "view_catalog"],
    ["/skill-learning", "skill_learning_listing", "view_catalog"],
    ["/account-services", "account_service_listing", "view_catalog"],
  ])("tracks both languages for %s", (path, contentType, eventName) => {
    for (const localePath of [path, `/en${path}`, `/en${path}/?utm_source=example#ignored`]) {
      expect(getPageViewEventName(localePath)).toBe(eventName);
      expect(getSeoContentType(localePath)).toBe(contentType);
      expect(isSeoTrackablePath(localePath)).toBe(true);
    }
  });

  it.each(["/admin/ai-workflows", "/api/ai-workflows", "/ai-workflows-extra", "/ai-skills-extra", "/login", "/register"])("does not treat %s as a public product landing", (path) => {
    expect(getPageViewEventName(path)).toBeNull();
    expect(isSeoTrackablePath(path)).toBe(false);
  });

  it("retains an English workflow landing once while navigating and switching languages", () => {
    const values = new Map<string, string>();
    const storage: AnalyticsSessionStorage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    };
    const first = getOrCreateSessionAttribution({
      pathname: "/en/ai-workflows/example",
      pageUrl: "https://www.enhe-tech.com.cn/en/ai-workflows/example",
      referrer: "https://chatgpt.com/",
      storage,
      now: () => 1_000,
    });
    expect(first.shouldTrackSeoLanding).toBe(true);
    expect(first.attribution).toMatchObject({ contentType: "ai_workflow_detail", locale: "en", source: "chatgpt", trafficMedium: "ai_answer_engine" });
    const next = getOrCreateSessionAttribution({
      pathname: "/ai-skills/example",
      pageUrl: "https://www.enhe-tech.com.cn/ai-skills/example",
      referrer: "https://www.enhe-tech.com.cn/en/ai-workflows/example",
      storage,
      now: () => 2_000,
    });
    expect(next.shouldTrackSeoLanding).toBe(false);
    expect(next.attribution.landingId).toBe(first.attribution.landingId);
    expect(next.attribution.firstLandingPath).toBe("/en/ai-workflows/example");
  });

  it("preserves the new content types in the reporting mix", () => {
    const report = buildSeoInsightReport({
      events: ["ai_skill_listing", "ai_skill_detail", "ai_workflow_listing", "ai_workflow_detail"].map(contentType => ({
        eventName: "seo_landing_view", path: "/unrecognized-legacy-path", metadata: { contentType },
      })),
      articles: [], tools: [], tutorials: [],
    });
    expect(report.contentTypeMix.map(x => x.contentType).sort()).toEqual(["ai_skill_listing", "ai_skill_detail", "ai_workflow_listing", "ai_workflow_detail"].sort());
  });

  it.each(["/ai-skills/example", "/en/ai-workflows/example"])("counts automatic completion without manual proof on %s", path => {
    const attribution = {
      sessionId: "session-direct", landingId: "landing-direct", firstLandingPath: path,
      landingPath: path, contentType: getSeoContentType(path), source: "google",
      trafficMedium: "organic_search", locale: path.startsWith("/en/") ? "en" : "zh",
      createdAt: 1, lastSeenAt: 1, attributionVersion: 2,
    };
    const events = ["seo_landing_view", "view_tool", "product_purchase_cta_click", "begin_checkout", "create_order", "purchase_completed"];
    const build = (names: string[]) => buildSeoInsightReport({
      events: names.map(eventName => ({ eventName, path, metadata: { attribution } })),
      articles: [], tools: [], tutorials: [],
    });
    expect(build(events).conversionFunnels.direct.rows.map(row => row.count)).toEqual([1, 1, 1, 1, 1, 1]);
    const manualAuditOnly = build([...events.slice(0, -1), "payment_review_approved"]);
    expect(manualAuditOnly.conversionFunnels.direct.rows.at(-1)?.count).toBe(0);
  });
});
