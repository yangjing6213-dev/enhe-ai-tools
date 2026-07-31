import { beforeEach, describe, expect, it, vi } from "vitest";

const { createEventMock, getCurrentUserMock } = vi.hoisted(() => ({
  createEventMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    analyticsEvent: { create: (input: unknown) => createEventMock(input) },
  },
}));

import {
  analyticsEventNames,
  clientWritableAnalyticsEventNames,
} from "@/lib/analytics";
import { POST } from "./route";

function request(body: unknown, contentType = "application/json") {
  return new Request("https://www.enhe-tech.com.cn/api/analytics", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "user-agent": "analytics-route-test",
      "x-forwarded-for": "203.0.113.8",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const clientEventSet = new Set<string>(clientWritableAnalyticsEventNames);
const serverOnlyEvents = analyticsEventNames.filter(
  (eventName) => !clientEventSet.has(eventName),
);

describe("POST /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(null);
    createEventMock.mockResolvedValue({ id: "event-1" });
  });

  it.each(serverOnlyEvents)(
    "rejects anonymous attempts to forge authoritative %s events",
    async (eventName) => {
      const response = await POST(
        request({
          eventName,
          context: { orderId: "forged-order" },
        }),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        ok: false,
        code: "SERVER_ONLY_EVENT",
      });
      expect(createEventMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    "product_purchase_cta_click",
    "home_account_services_cta_click",
    "home_skill_learning_cta_click",
    "home_task_outcome_click",
    "home_tool_finder_cta_click",
    "home_practical_ai_learning_click",
  ])("accepts the main-site client event %s", async (eventName) => {
    const response = await POST(request({ eventName, path: "/software/demo" }));

    expect(response.status).toBe(200);
    expect(createEventMock).toHaveBeenCalledOnce();
  });

  it("stores bounded first-touch attribution without referrer query data", async () => {
    const response = await POST(request({
      eventName: "seo_landing_view",
      path: "/ai-news/guide",
      metadata: {
        sessionId: "session-1",
        landingId: "landing-1",
        firstLandingPath: "/ai-news/guide",
        source: "google",
        trafficMedium: "organic_search",
        referrer: "https://www.google.com/search?q=private#results",
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
          attributionVersion: 2,
        },
      },
    }));

    expect(response.status).toBe(200);
    expect(createEventMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          referrer: "https://www.google.com",
          attribution: expect.objectContaining({ landingId: "landing-1" }),
        }),
      }),
    });
  });

  it("persists only allowlisted scalar metadata and bounded client context", async () => {
    const response = await POST(
      request({
        eventName: "seo_audit_paywall_viewed",
        path: "/en/online-tools/seo-geo-audit",
        entityType: "seo_audit_run",
        entityId: "run-1",
        metadata: {
          offerCount: 2,
          placement: "hero",
          eventTrust: "server",
          email: "owner@example.com",
          nested: { private: true },
          unknown: "discard-me",
        },
        context: {
          clientId: "client-1",
          sessionId: "session-1",
          source: "xiaohongshu",
          medium: "organic_social",
          campaign: "launch-week",
          offerId: "seo-audit-professional",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(createEventMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventName: "seo_audit_paywall_viewed",
        path: "/en/online-tools/seo-geo-audit",
        userId: undefined,
        metadata: {
          offerCount: 2,
          placement: "hero",
          product: "seo_geo_audit",
          eventTrust: "client",
          clientId: "client-1",
          sessionId: "session-1",
          source: "xiaohongshu",
          medium: "organic_social",
          campaign: "launch-week",
          offerId: "seo-audit-professional",
        },
      }),
    });
    const serialized = JSON.stringify(createEventMock.mock.calls[0]);
    expect(serialized).not.toContain("owner@example.com");
    expect(serialized).not.toContain("discard-me");
    expect(serialized).not.toContain("private");
  });

  it("rejects forged order context and oversized request bodies", async () => {
    const forged = await POST(
      request({
        eventName: "seo_audit_paywall_viewed",
        context: {
          clientId: "client-1",
          sessionId: "session-1",
          orderId: "order-1",
        },
      }),
    );
    expect(forged.status).toBe(400);

    const oversized = await POST(
      request({
        eventName: "seo_audit_landing_view",
        metadata: { unknown: "x".repeat(9_000) },
      }),
    );
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({
      ok: false,
      code: "REQUEST_TOO_LARGE",
    });
    expect(createEventMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON and unknown events before touching storage", async () => {
    const unsupported = await POST(request("event", "text/plain"));
    expect(unsupported.status).toBe(415);

    const unknown = await POST(request({ eventName: "unknown_event" }));
    expect(unknown.status).toBe(400);
    expect(createEventMock).not.toHaveBeenCalled();
  });

  it("reports storage failure instead of accepting a dropped event", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    createEventMock.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await POST(
      request({
        eventName: "seo_audit_landing_view",
        path: "/online-tools/seo-geo-audit",
        context: { clientId: "client-1", sessionId: "session-1" },
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, stored: false });
  });
});
