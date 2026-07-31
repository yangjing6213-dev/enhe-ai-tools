import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_SESSION_IDLE_TIMEOUT_MS,
  getActiveSessionAttribution,
  getAndRefreshActiveSessionAttribution,
  getOrCreateSessionAttribution,
  isSeoAuditLandingPath,
  shouldTrackAnalyticsAction,
  mergeAttributionMetadata,
  sendAnalyticsRequest,
  type AnalyticsSessionStorage
} from "@/components/analytics-tracker";
import { getPageViewEventName } from "@/lib/analytics-client";
import { toSafeAnalyticsReferrerOrigin } from "@/lib/analytics-client-payload";

function createMemoryStorage(): AnalyticsSessionStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

describe("browser analytics attribution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks a purchase button click and only tracks checkout when its form submits", () => {
    expect(shouldTrackAnalyticsAction("click", "BUTTON")).toBe(true);
    expect(shouldTrackAnalyticsAction("click", "FORM")).toBe(false);
    expect(shouldTrackAnalyticsAction("submit", "FORM")).toBe(true);
    expect(shouldTrackAnalyticsAction("submit", "BUTTON")).toBe(false);
  });

  it("keeps referrer attribution to an origin without query or hash", () => {
    expect(toSafeAnalyticsReferrerOrigin("https://www.google.com/search?q=private#results")).toBe("https://www.google.com");
    expect(toSafeAnalyticsReferrerOrigin("not a URL")).toBeUndefined();
  });

  it("records only the first SEO landing in one browser session", () => {
    const storage = createMemoryStorage();
    const ids = ["session-1", "landing-1"];
    const createId = () => ids.shift() ?? "unexpected-id";

    const first = getOrCreateSessionAttribution({
      pathname: "/en/ai-news/guide",
      pageUrl: "https://www.enhe-tech.com.cn/en/ai-news/guide",
      referrer: "https://www.google.com/search?q=ai+guide",
      language: "en",
      storage,
      createId,
      now: () => 1_000
    });
    const second = getOrCreateSessionAttribution({
      pathname: "/en/software/demo",
      pageUrl: "https://www.enhe-tech.com.cn/en/software/demo",
      referrer: "https://www.enhe-tech.com.cn/en/ai-news/guide",
      language: "en",
      storage,
      createId,
      now: () => 2_000
    });

    expect(first.shouldTrackSeoLanding).toBe(true);
    expect(second.shouldTrackSeoLanding).toBe(false);
    expect(second.attribution).toMatchObject({
      sessionId: "session-1",
      landingId: "landing-1",
      createdAt: 1_000,
      lastSeenAt: 2_000
    });
    expect(first.attribution).toMatchObject({
      sessionId: "session-1",
      landingId: "landing-1",
      firstLandingPath: "/en/ai-news/guide",
      landingPath: "/ai-news/guide",
      source: "google",
      trafficMedium: "organic_search",
      referrerHost: "google.com",
      locale: "en",
      createdAt: 1_000,
      lastSeenAt: 1_000
    });
  });

  it("starts a new attribution after the previous browser session is idle", () => {
    const storage = createMemoryStorage();
    const firstIds = ["session-old", "landing-old"];
    const first = getOrCreateSessionAttribution({
      pathname: "/ai-news/old-guide",
      pageUrl: "https://www.enhe-tech.com.cn/ai-news/old-guide",
      referrer: "https://www.google.com/search?q=old+guide",
      storage,
      createId: () => firstIds.shift() ?? "unexpected-old-id",
      now: () => 1_000
    });
    const nextIds = ["session-new", "landing-new"];

    const next = getOrCreateSessionAttribution({
      pathname: "/ai-news/new-guide",
      pageUrl: "https://www.enhe-tech.com.cn/ai-news/new-guide",
      referrer: "https://www.baidu.com/s?wd=new+guide",
      storage,
      createId: () => nextIds.shift() ?? "unexpected-new-id",
      now: () => 1_000 + ANALYTICS_SESSION_IDLE_TIMEOUT_MS + 1
    });

    expect(first.attribution.landingId).toBe("landing-old");
    expect(next.shouldTrackSeoLanding).toBe(true);
    expect(next.attribution).toMatchObject({
      sessionId: "session-new",
      landingId: "landing-new",
      source: "baidu",
      trafficMedium: "organic_search",
      createdAt: 1_000 + ANALYTICS_SESSION_IDLE_TIMEOUT_MS + 1,
      lastSeenAt: 1_000 + ANALYTICS_SESSION_IDLE_TIMEOUT_MS + 1
    });
  });

  it("does not attach an expired attribution to an action on the same page", () => {
    const storage = createMemoryStorage();
    const ids = ["session-old", "landing-old"];
    getOrCreateSessionAttribution({
      pathname: "/ai-news/guide",
      pageUrl: "https://www.enhe-tech.com.cn/ai-news/guide",
      referrer: "https://www.google.com/search?q=ai+guide",
      storage,
      createId: () => ids.shift() ?? "unexpected-id",
      now: () => 1_000
    });

    expect(
      getActiveSessionAttribution({
        storage,
        cookie: "",
        now: () => 1_000 + ANALYTICS_SESSION_IDLE_TIMEOUT_MS + 1
      })
    ).toBeNull();
  });

  it("extends the idle window when the user acts on the same page", () => {
    const storage = createMemoryStorage();
    const ids = ["session-active", "landing-active"];
    getOrCreateSessionAttribution({
      pathname: "/software/demo",
      pageUrl: "https://www.enhe-tech.com.cn/software/demo",
      referrer: "https://www.baidu.com/s?wd=ai+software",
      storage,
      createId: () => ids.shift() ?? "unexpected-id",
      now: () => 1_000
    });
    const actionTime = 1_000 + ANALYTICS_SESSION_IDLE_TIMEOUT_MS - 60_000;

    const refreshed = getAndRefreshActiveSessionAttribution({
      storage,
      cookie: "",
      now: () => actionTime
    });
    const stillActive = getActiveSessionAttribution({
      storage,
      cookie: "",
      now: () => actionTime + 2 * 60_000
    });

    expect(refreshed?.lastSeenAt).toBe(actionTime);
    expect(stillActive?.landingId).toBe("landing-active");
  });

  it("preserves existing event metadata while attaching the same attribution", () => {
    const attribution = {
      sessionId: "session-1",
      landingId: "landing-1",
      firstLandingPath: "/ai-news/guide",
      landingPath: "/ai-news/guide",
      contentType: "ai_news_article",
      source: "google",
      trafficMedium: "organic_search" as const,
      locale: "zh" as const,
      createdAt: 1_000,
      lastSeenAt: 1_000,
      attributionVersion: 2 as const
    };

    expect(mergeAttributionMetadata({ source: "ai-news", toolId: "tool-1" }, attribution)).toMatchObject({
      source: "ai-news",
      toolId: "tool-1",
      sessionId: "session-1",
      landingId: "landing-1",
      firstLandingPath: "/ai-news/guide",
      attribution: { source: "google", trafficMedium: "organic_search" }
    });
  });

  it("rejects oversized stored attribution instead of refreshing it", () => {
    const storage = createMemoryStorage();
    storage.setItem("enhe.analytics.attribution.v2", JSON.stringify({
      sessionId: "s".repeat(121),
      landingId: "landing-1",
      firstLandingPath: "/ai-news/guide",
      landingPath: "/ai-news/guide",
      contentType: "ai_news_article",
      source: "google",
      trafficMedium: "organic_search",
      locale: "zh",
      createdAt: 1,
      lastSeenAt: 2,
      attributionVersion: 2
    }));

    expect(getActiveSessionAttribution({ storage, cookie: "", now: () => 3 })).toBeNull();
  });

  it("bounds campaign and query values before persisting a new attribution", () => {
    const storage = createMemoryStorage();
    const ids = ["session-1", "landing-1"];
    const result = getOrCreateSessionAttribution({
      pathname: "/ai-news/guide?private=1",
      pageUrl: `https://www.enhe-tech.com.cn/ai-news/guide?utm_source=${"s".repeat(200)}&utm_medium=${"m".repeat(200)}`,
      referrer: `https://www.google.com/search?q=${"q".repeat(400)}`,
      storage,
      createId: () => ids.shift() ?? "unexpected-id",
      now: () => 1
    });

    expect(result.attribution.firstLandingPath).toBe("/ai-news/guide");
    expect(result.attribution.utmSource).toHaveLength(100);
    expect(result.attribution.utmMedium).toHaveLength(100);
    expect(result.attribution.searchQuery).toHaveLength(200);
  });

  it("falls back to fetch when sendBeacon reports that it did not queue the event", async () => {
    const sendBeacon = vi.fn(() => false);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    await sendAnalyticsRequest('{"eventName":"view_tool"}');

    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/analytics", expect.objectContaining({
      method: "POST",
      keepalive: true
    }));
  });

  it("falls back to fetch exactly once when sendBeacon throws", async () => {
    const sendBeacon = vi.fn(() => {
      throw new Error("beacon unavailable");
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    await sendAnalyticsRequest('{"eventName":"view_tool"}');

    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/analytics", expect.objectContaining({
      method: "POST",
      keepalive: true
    }));
  });
});

describe("SEO audit analytics routes", () => {
  it("recognizes the live Chinese and English landing routes", () => {
    expect(isSeoAuditLandingPath("/online-tools/seo-geo-audit")).toBe(true);
    expect(isSeoAuditLandingPath("/en/online-tools/seo-geo-audit")).toBe(true);
  });

  it("classifies English and Chinese public routes through one helper", () => {
    for (const path of ["/", "/en"]) {
      expect(getPageViewEventName(path)).toBe("visit_home");
    }
    for (const path of ["/pricing", "/en/pricing"]) {
      expect(getPageViewEventName(path)).toBe("view_pricing");
    }
    for (const path of [
      "/software/example",
      "/en/software/example",
      "/tools/example",
      "/en/tools/example",
    ]) {
      expect(getPageViewEventName(path)).toBe("view_tool");
    }
  });
});
