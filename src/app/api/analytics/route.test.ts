import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, prismaMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  prismaMock: {
    analyticsEvent: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { POST } from "./route";
import { sanitizeAnalyticsClientPayload, toSafeAnalyticsHostname } from "@/lib/analytics-client-payload";

function createRequest(eventName: string, payload: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, path: "/software/demo", ...payload })
  });
}

describe("POST /api/analytics", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    prismaMock.analyticsEvent.create.mockReset();
    getCurrentUserMock.mockResolvedValue(null);
    prismaMock.analyticsEvent.create.mockResolvedValue({ id: "event-1" });
  });

  it.each([
    "create_order",
    "payment_proof_submitted",
    "payment_review_approved",
    "payment_review_rejected",
    "order_receipt_submitted",
    "refund_request_submitted"
  ])("rejects the server-only event %s from the public client endpoint", async (eventName) => {
    const response = await POST(createRequest(eventName));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false });
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it.each([
    "product_purchase_cta_click",
    "home_account_services_cta_click",
    "home_skill_learning_cta_click",
    "home_task_outcome_click",
    "home_tool_finder_cta_click",
    "home_practical_ai_learning_click"
  ])("continues to accept the client analytics event %s", async (eventName) => {
    const response = await POST(createRequest(eventName));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledOnce();
  });

  it("accepts only bounded allowlisted metadata and stores a minimal referrer", async () => {
    const response = await POST(createRequest("seo_landing_view", {
      metadata: {
        sessionId: "session-1",
        landingId: "landing-1",
        firstLandingPath: "/ai-news/guide",
        source: "google",
        trafficMedium: "organic_search",
        referrer: "https://www.google.com/search?q=private+query#results",
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
          lastSeenAt: 1,
          attributionVersion: 2
        }
      }
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ referrer: "https://www.google.com" })
      })
    });
  });

  it("reduces a long HTTP referrer to its origin before applying the stored-value limit", async () => {
    const response = await POST(createRequest("seo_landing_view", {
      metadata: {
        sessionId: "session-1",
        landingId: "landing-1",
        firstLandingPath: "/ai-news/guide",
        source: "google",
        trafficMedium: "organic_search",
        referrer: `https://www.google.com/search?q=${"private".repeat(200)}#results`
      }
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ referrer: "https://www.google.com" })
      })
    });
  });

  it("accepts a cleaned AI news search payload with bounded path, UTM, and filter values", async () => {
    const payload = sanitizeAnalyticsClientPayload({
      eventName: "search_ai_news",
      path: `ai-news/${"p".repeat(600)}?${"q".repeat(600)}#filters`,
      metadata: {
        query: "q".repeat(240),
        category: "c".repeat(140),
        tag: "t".repeat(140),
        utmSource: "s".repeat(110),
        utmMedium: "m".repeat(110),
        utmCampaign: "c".repeat(170),
        referrer: `https://www.google.com/search?q=${"private".repeat(200)}#results`
      }
    });
    const response = await POST(new Request("http://localhost/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        path: expect.stringMatching(/^\//),
        metadata: expect.objectContaining({
          query: "q".repeat(200),
          category: "c".repeat(120),
          tag: "t".repeat(120),
          utmSource: "s".repeat(100),
          utmMedium: "m".repeat(100),
          utmCampaign: "c".repeat(160),
          referrer: "https://www.google.com"
        })
      })
    });
  });

  it.each(["path", "entityType", "entityId"] as const)("rejects a whitespace-only top-level %s", async (field) => {
    const response = await POST(createRequest("view_tool", { [field]: "  \t  " }));

    expect(response.status).toBe(400);
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("keeps nullable top-level analytics fields compatible", async () => {
    const response = await POST(createRequest("view_tool", {
      path: null,
      entityType: null,
      entityId: null
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledOnce();
  });

  it.each([
    "not a URL",
    "ftp://example.com/private",
    "javascript:alert(1)"
  ])("rejects an invalid referrer value: %s", async (referrer) => {
    const response = await POST(createRequest("seo_landing_view", {
      metadata: { referrer }
    }));

    expect(response.status).toBe(400);
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("accepts analytics metadata when referrer is omitted", async () => {
    const response = await POST(createRequest("seo_landing_view", {
      metadata: { source: "direct", trafficMedium: "direct" }
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledOnce();
  });

  it.each([
    { hostname: `${"a".repeat(63)}.example`, accepted: true },
    { hostname: "example..com", accepted: false },
    { hostname: "-bad.example", accepted: false },
    { hostname: "bad-.example", accepted: false },
    { hostname: `${"a".repeat(64)}.example`, accepted: false }
  ])("keeps the client and API hostname boundary aligned for $hostname", async ({ hostname, accepted }) => {
    const clientPayload = sanitizeAnalyticsClientPayload({
      eventName: "seo_landing_view",
      metadata: { referrerHost: hostname }
    });
    const response = await POST(createRequest("seo_landing_view", {
      metadata: { referrerHost: hostname }
    }));

    expect(toSafeAnalyticsHostname(hostname)).toBe(accepted ? hostname : undefined);
    expect(clientPayload.metadata?.referrerHost).toBe(accepted ? hostname : undefined);
    expect(response.status).toBe(accepted ? 200 : 400);
  });

  it("rejects nested attribution whose createdAt is later than lastSeenAt", async () => {
    const attribution = {
      sessionId: "session-1",
      landingId: "landing-1",
      firstLandingPath: "/ai-news/guide",
      landingPath: "/ai-news/guide",
      contentType: "ai_news_article",
      source: "google",
      trafficMedium: "organic_search",
      locale: "zh",
      createdAt: 2,
      lastSeenAt: 1,
      attributionVersion: 2
    };
    const clientPayload = sanitizeAnalyticsClientPayload({
      eventName: "seo_landing_view",
      metadata: { attribution }
    });
    const response = await POST(createRequest("seo_landing_view", {
      metadata: { attribution }
    }));

    expect(clientPayload.metadata?.attribution).toBeUndefined();
    expect(response.status).toBe(400);
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("rejects metadata outside the client allowlist or length limits", async () => {
    const response = await POST(createRequest("view_tool", {
      metadata: { unexpected: "value", target: "x".repeat(121) }
    }));

    expect(response.status).toBe(400);
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("removes queries and fragments from paths before storage", async () => {
    const response = await POST(createRequest("view_tool", {
      path: "/software/demo?email=private@example.com#checkout",
      metadata: {
        firstLandingPath: "/ai-news/guide?email=private@example.com",
        landingPath: "/ai-news/guide#private"
      }
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.analyticsEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        path: "/software/demo",
        metadata: expect.objectContaining({
          firstLandingPath: "/ai-news/guide",
          landingPath: "/ai-news/guide"
        })
      })
    });
  });
});
