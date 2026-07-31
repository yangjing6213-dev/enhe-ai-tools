import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock, prismaMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
  prismaMock: {
    analyticsEvent: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { trackAnalyticsEvent } from "@/lib/analytics";
import { serializeAnalyticsAttributionCookie } from "@/lib/analytics-client-payload";

const buyerAttribution = {
  sessionId: "session-buyer",
  landingId: "landing-buyer",
  firstLandingPath: "/ai-news/guide",
  landingPath: "/ai-news/guide",
  contentType: "ai_news_article",
  source: "google",
  trafficMedium: "organic_search",
  locale: "zh",
  createdAt: 1,
  lastSeenAt: 2,
  attributionVersion: 2
};

function attributionCookie(attribution: Record<string, unknown>) {
  return `enhe_analytics_attribution=${encodeURIComponent(JSON.stringify(attribution))}`;
}

describe("server analytics attribution", () => {
  beforeEach(() => {
    headersMock.mockReset();
    prismaMock.analyticsEvent.create.mockReset();
    prismaMock.analyticsEvent.findMany.mockReset();
    prismaMock.analyticsEvent.findMany.mockResolvedValue([]);
  });

  it("adds the browser attribution cookie to an existing checkout event", async () => {
    headersMock.mockResolvedValue(
      new Headers({ cookie: attributionCookie(buyerAttribution), "user-agent": "test-browser" })
    );

    await trackAnalyticsEvent({
      eventName: "create_order",
      path: "/software/demo",
      entityType: "order",
      entityId: "order-1",
      metadata: { orderType: "software_download" }
    });

    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          orderType: "software_download",
          sessionId: "session-buyer",
          landingId: "landing-buyer",
          firstLandingPath: "/ai-news/guide",
          attribution: expect.objectContaining({ source: "google", trafficMedium: "organic_search" })
        })
      })
    });
  });

  it("inherits the buyer attribution for an order event created from the admin session", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        cookie: attributionCookie({
          ...buyerAttribution,
          sessionId: "session-admin",
          landingId: "landing-admin",
          source: "direct"
        })
      })
    );
    prismaMock.analyticsEvent.findMany.mockResolvedValue([{
      metadata: {
        sessionId: buyerAttribution.sessionId,
        landingId: buyerAttribution.landingId,
        firstLandingPath: buyerAttribution.firstLandingPath,
        attribution: buyerAttribution
      }
    }]);

    await trackAnalyticsEvent({
      eventName: "payment_review_approved",
      path: "/admin/payments/proof-1",
      entityType: "order",
      entityId: "order-1",
      metadata: { decision: "approved" }
    });

    expect(prismaMock.analyticsEvent.findMany).toHaveBeenCalled();
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          decision: "approved",
          sessionId: "session-buyer",
          landingId: "landing-buyer"
        })
      })
    });
  });

  it("does not attach an oversized forged attribution cookie to a server event", async () => {
    headersMock.mockResolvedValue(new Headers({
      cookie: attributionCookie({ ...buyerAttribution, sessionId: "s".repeat(121) })
    }));

    await trackAnalyticsEvent({
      eventName: "create_order",
      path: "/software/demo",
      entityType: "order",
      entityId: "order-1",
      metadata: { orderType: "software_download" }
    });

    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { orderType: "software_download" }
      })
    });
  });

  it("inherits landingId from a bounded compact cookie on create_order", async () => {
    const maximalAttribution = {
      ...buyerAttribution,
      sessionId: "s".repeat(120),
      landingId: "l".repeat(120),
      firstLandingPath: `/${"f".repeat(299)}`,
      landingPath: `/${"p".repeat(299)}`,
      contentType: "c".repeat(80),
      source: "o".repeat(80),
      searchEngine: "e".repeat(80),
      searchQuery: "q".repeat(200),
      utmSource: "u".repeat(100),
      utmMedium: "m".repeat(100),
      utmCampaign: "a".repeat(160)
    };
    const serialized = serializeAnalyticsAttributionCookie(maximalAttribution);
    headersMock.mockResolvedValue(new Headers({
      cookie: `enhe_analytics_attribution=${serialized}`
    }));

    await trackAnalyticsEvent({
      eventName: "create_order",
      entityType: "order",
      entityId: "order-max-cookie"
    });

    expect(serialized).not.toBeNull();
    expect(serialized!.length).toBeLessThanOrEqual(4096);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ landingId: maximalAttribution.landingId })
      })
    });
  });

  it("scans a bounded newest-first order batch past bad proof and receipt attribution", async () => {
    headersMock.mockResolvedValue(new Headers());
    const createOrderEvent = { metadata: { attribution: buyerAttribution } };
    const badProofEvent = {
      metadata: { attribution: { ...buyerAttribution, landingId: "broken", createdAt: 3, lastSeenAt: 2 } }
    };
    const badReceiptEvent = { metadata: { ...buyerAttribution, landingId: "top-level-only" } };
    prismaMock.analyticsEvent.findMany.mockResolvedValue([
      badReceiptEvent,
      badProofEvent,
      createOrderEvent
    ]);

    await trackAnalyticsEvent({
      eventName: "payment_review_approved",
      entityType: "order",
      entityId: "order-history",
      metadata: { decision: "approved" }
    });

    expect(prismaMock.analyticsEvent.findMany).toHaveBeenCalledWith({
      where: {
        entityType: "order",
        entityId: "order-history",
        eventName: { in: expect.any(Array) }
      },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ landingId: buyerAttribution.landingId })
      })
    });
  });
});
