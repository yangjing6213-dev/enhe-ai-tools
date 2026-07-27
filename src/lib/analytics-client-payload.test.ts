import { describe, expect, it } from "vitest";
import {
  analyticsAttributionMaxSerializedLength,
  parseAnalyticsAttributionCookieValue,
  sanitizeAnalyticsClientPayload,
  serializeAnalyticsAttributionCookie
} from "@/lib/analytics-client-payload";

describe("analytics client payload sanitization", () => {
  it("bounds AI news, attribution, and path values before sending an event", () => {
    const payload = sanitizeAnalyticsClientPayload({
      eventName: "search_ai_news",
      path: `ai-news/${"p".repeat(600)}?${"x".repeat(600)}#filters`,
      entityType: "search",
      entityId: "ai-news",
      metadata: {
        query: "q".repeat(240),
        category: "c".repeat(140),
        tag: "t".repeat(140),
        utmSource: "s".repeat(110),
        utmMedium: "m".repeat(110),
        utmCampaign: "c".repeat(170),
        referrer: `https://www.google.com/search?q=${"private".repeat(200)}#results`,
        attribution: {
          sessionId: "session-1",
          landingId: "landing-1",
          firstLandingPath: `ai-news/${"p".repeat(600)}?${"x".repeat(600)}#filters`,
          landingPath: `ai-news/${"p".repeat(600)}?${"x".repeat(600)}#filters`,
          contentType: "ai_news_article",
          source: "google",
          trafficMedium: "organic_search",
          utmSource: "s".repeat(110),
          utmMedium: "m".repeat(110),
          utmCampaign: "c".repeat(170),
          referrer: `https://www.google.com/search?q=${"private".repeat(200)}#results`,
          locale: "zh",
          createdAt: 1,
          lastSeenAt: 1,
          attributionVersion: 2
        }
      }
    });

    expect(payload.path).toHaveLength(300);
    expect(payload.path).toMatch(/^\//);
    expect(payload.path).not.toContain("?");
    expect(payload.path).not.toContain("#");
    expect(payload.metadata).toMatchObject({
      query: "q".repeat(200),
      category: "c".repeat(120),
      tag: "t".repeat(120),
      utmSource: "s".repeat(100),
      utmMedium: "m".repeat(100),
      utmCampaign: "c".repeat(160),
      referrer: "https://www.google.com",
      attribution: {
        firstLandingPath: expect.stringMatching(/^\//),
        landingPath: expect.stringMatching(/^\//),
        utmSource: "s".repeat(100),
        utmMedium: "m".repeat(100),
        utmCampaign: "c".repeat(160),
        referrer: "https://www.google.com"
      }
    });
    expect((payload.metadata?.attribution as Record<string, string>).firstLandingPath).toHaveLength(300);
    expect((payload.metadata?.attribution as Record<string, string>).landingPath).toHaveLength(300);
  });

  it("keeps only metadata accepted by the strict analytics API", () => {
    const payload = sanitizeAnalyticsClientPayload({
      eventName: "view_tool",
      path: "/software/demo",
      metadata: {
        source: "ai-news",
        target: "demo",
        unexpected: "reject-me",
        attribution: {
          sessionId: "session-1",
          landingId: "landing-1",
          firstLandingPath: "/ai-news/guide",
          landingPath: "/ai-news/guide",
          contentType: "ai_news_article",
          source: "google",
          trafficMedium: "organic_search",
          locale: "zh",
          createdAt: 1,
          lastSeenAt: 2,
          attributionVersion: 2,
          unexpectedNested: "reject-me"
        }
      }
    });

    expect(payload.metadata).toMatchObject({
      source: "ai-news",
      target: "demo",
      attribution: {
        sessionId: "session-1",
        landingId: "landing-1",
        contentType: "ai_news_article",
        trafficMedium: "organic_search"
      }
    });
    expect(payload.metadata).not.toHaveProperty("unexpected");
    expect(payload.metadata?.attribution).not.toHaveProperty("unexpectedNested");
  });

  it("serializes a maximal attribution into a bounded compact cookie payload", () => {
    const attribution = {
      sessionId: "s".repeat(120),
      landingId: "l".repeat(120),
      firstLandingPath: `/${"f".repeat(299)}`,
      landingPath: `/${"p".repeat(299)}`,
      contentType: "c".repeat(80),
      source: "o".repeat(80),
      trafficMedium: "organic_search" as const,
      searchEngine: "e".repeat(80),
      searchQuery: "q".repeat(200),
      referrer: "https://referrer.example",
      referrerHost: "referrer.example",
      utmSource: "u".repeat(100),
      utmMedium: "m".repeat(100),
      utmCampaign: "a".repeat(160),
      locale: "zh" as const,
      createdAt: Number.MAX_SAFE_INTEGER - 1,
      lastSeenAt: Number.MAX_SAFE_INTEGER,
      attributionVersion: 2 as const
    };

    const serialized = serializeAnalyticsAttributionCookie(attribution);

    expect(serialized).not.toBeNull();
    expect(serialized!.length).toBeLessThanOrEqual(analyticsAttributionMaxSerializedLength);
    expect(JSON.parse(decodeURIComponent(serialized!))).not.toHaveProperty("searchQuery");
    expect(parseAnalyticsAttributionCookieValue(serialized!)).toMatchObject({
      sessionId: attribution.sessionId,
      landingId: attribution.landingId,
      firstLandingPath: attribution.firstLandingPath,
      landingPath: attribution.landingPath
    });
  });
});
