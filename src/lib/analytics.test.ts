import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { analyticsEventCreate, headersMock } = vi.hoisted(() => ({
  analyticsEventCreate: vi.fn(),
  headersMock: vi.fn()
}));

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/lib/db", () => ({
  prisma: { analyticsEvent: { create: analyticsEventCreate } }
}));

import {
  analyticsEventNames,
  analyticsFunnelSteps,
  buildAnalyticsEventMetadata,
  buildAnalyticsFunnel,
  clientWritableAnalyticsEventNames,
  getPageViewEventName,
  isClientWritableAnalyticsEventName,
  isAnalyticsEventName,
  isMissingAnalyticsStorageError,
  seoAuditEventNames,
  seoAuditFunnelSteps,
  sanitizeClientAnalyticsMetadata,
  trackAnalyticsEvent
} from "@/lib/analytics";

describe("analytics funnel helpers", () => {
  it("maps important pages to launch funnel events", () => {
    expect(getPageViewEventName("/")).toBe("visit_home");
    expect(getPageViewEventName("/software/faceswap-studio")).toBe("view_tool");
    expect(getPageViewEventName("/skill-learning/prompt-engineering")).toBe("view_tool");
    expect(getPageViewEventName("/account-services/chatgpt-plus")).toBe("view_tool");
    expect(getPageViewEventName("/tools/faceswap-studio")).toBe("view_tool");
    expect(getPageViewEventName("/pricing")).toBe("view_pricing");
    expect(getPageViewEventName("/user")).toBe("view_user_center");
    expect(getPageViewEventName("/en")).toBe("visit_home");
    expect(getPageViewEventName("/en/pricing")).toBe("view_pricing");
    expect(getPageViewEventName("/en/user")).toBe("view_user_center");
    expect(getPageViewEventName("/en/software/faceswap-studio")).toBe(
      "view_tool",
    );
  });

  it("builds the commercial funnel in product order", () => {
    const rows = buildAnalyticsFunnel([
      { eventName: "create_order", count: 2 },
      { eventName: "visit_home", count: 18 },
      { eventName: "payment_proof_submitted", count: 1 },
      { eventName: "click_open_vip", count: 4 }
    ]);

    expect(rows.map((row) => row.eventName)).toEqual(analyticsFunnelSteps);
    expect(rows.find((row) => row.eventName === "visit_home")?.count).toBe(18);
    expect(rows.find((row) => row.eventName === "view_tool")?.count).toBe(0);
    expect(rows.find((row) => row.eventName === "create_order")?.conversionRate).toBe(50);
  });

  it("validates only known event names", () => {
    expect(isAnalyticsEventName("refund_request_submitted")).toBe(true);
    expect(isAnalyticsEventName("search_ai_news")).toBe(true);
    expect(isAnalyticsEventName("home_free_claim_cta_click")).toBe(true);
    expect(isAnalyticsEventName("home_hot_ai_tools_cta_click")).toBe(true);
    expect(isAnalyticsEventName("validation_ai_prompt_kit_cta_click")).toBe(true);
    expect(isAnalyticsEventName("validation_faceswap_cta_click")).toBe(true);
    expect(isAnalyticsEventName("validation_ai_video_cta_click")).toBe(true);
    expect(seoAuditFunnelSteps.every(isAnalyticsEventName)).toBe(true);
    expect(isAnalyticsEventName("unknown_event")).toBe(false);
  });

  it("defines the SEO audit funnel in commercial order", () => {
    expect(seoAuditFunnelSteps).toEqual([
      "seo_audit_landing_view",
      "seo_audit_submitted",
      "seo_audit_completed",
      "seo_audit_paywall_viewed",
      "seo_audit_checkout_started",
      "seo_audit_purchased",
      "seo_audit_report_downloaded"
    ]);
    expect(seoAuditEventNames).toEqual([
      "seo_audit_landing_view",
      "seo_audit_submitted",
      "seo_audit_completed",
      "seo_audit_failed",
      "seo_audit_summary_viewed",
      "seo_audit_paywall_viewed",
      "seo_audit_checkout_started",
      "seo_audit_purchased",
      "seo_audit_report_downloaded",
      "seo_audit_prompt_copied",
      "seo_audit_recheck_started",
      "seo_audit_monitoring_viewed",
      "seo_audit_monitoring_purchased",
      "seo_audit_schedule_enabled",
      "seo_audit_schedule_paused"
    ]);
  });

  it("allows clients to write behavior events but not authoritative funnel events", () => {
    const allowed = new Set<string>(clientWritableAnalyticsEventNames);
    for (const eventName of analyticsEventNames) {
      expect(isClientWritableAnalyticsEventName(eventName)).toBe(
        allowed.has(eventName),
      );
    }
    for (const authoritative of [
      "create_order",
      "payment_proof_submitted",
      "payment_review_approved",
      "payment_review_rejected",
      "refund_request_submitted",
      "order_receipt_submitted",
      "seo_audit_purchased",
    ]) {
      expect(isClientWritableAnalyticsEventName(authoritative)).toBe(false);
    }
  });

  it("keeps only event-specific bounded scalar client metadata", () => {
    expect(
      sanitizeClientAnalyticsMetadata("seo_landing_view", {
        landingPath: "/ai-news/seo-guide",
        contentType: "article",
        locale: "en",
        searchQuery: "private customer question",
        email: "owner@example.com",
        nested: { private: true },
        utmCampaign: "owner@example.com",
        unknown: "discard-me",
      }),
    ).toEqual({
      landingPath: "/ai-news/seo-guide",
      contentType: "article",
      locale: "en",
    });
    expect(
      sanitizeClientAnalyticsMetadata("seo_audit_paywall_viewed", {
        offerCount: 2,
        placement: "hero",
        nested: ["not", "scalar"],
        huge: "x".repeat(10_000),
      }),
    ).toEqual({ offerCount: 2, placement: "hero" });
  });

  it("stores correlation context in metadata and strips client-supplied order linkage", () => {
    const clientMetadata = buildAnalyticsEventMetadata({
      eventName: "seo_audit_paywall_viewed",
      trust: "client",
      metadata: { placement: "hero", eventTrust: "server" },
      context: {
        clientId: "client-1",
        sessionId: "session-1",
        source: "xiaohongshu",
        medium: "organic_social",
        campaign: "launch-week",
        offerId: "seo-audit-professional",
        orderId: "forged-order"
      }
    });

    expect(clientMetadata).toMatchObject({
      placement: "hero",
      eventTrust: "client",
      product: "seo_geo_audit",
      clientId: "client-1",
      sessionId: "session-1",
      source: "xiaohongshu",
      medium: "organic_social",
      campaign: "launch-week",
      offerId: "seo-audit-professional"
    });
    expect(clientMetadata).not.toHaveProperty("orderId");

    expect(buildAnalyticsEventMetadata({
      eventName: "seo_audit_purchased",
      trust: "server",
      metadata: { reconciliation: { provider: "zpay" } },
      context: { clientId: "client-1", sessionId: "session-1", orderId: "order-1" }
    })).toMatchObject({
      eventTrust: "server",
      product: "seo_geo_audit",
      clientId: "client-1",
      sessionId: "session-1",
      orderId: "order-1",
      reconciliation: { provider: "zpay" },
    });
  });

  it("recognizes missing analytics storage errors as non-blocking", () => {
    expect(isMissingAnalyticsStorageError({ code: "P2021", meta: { table: "public.analytics_events" } })).toBe(true);
    expect(isMissingAnalyticsStorageError({ code: "P2002" })).toBe(false);
    expect(isMissingAnalyticsStorageError(new Error("other failure"))).toBe(false);
  });
});

describe("server analytics tracking", () => {
  beforeEach(() => {
    analyticsEventCreate.mockReset().mockResolvedValue({ id: "event-1" });
    headersMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the first forwarded IP and user agent in a request context", async () => {
    headersMock.mockResolvedValue(new Headers({
      "x-forwarded-for": " 203.0.113.10, 10.0.0.1 ",
      "user-agent": "request-agent/1.0"
    }));

    await trackAnalyticsEvent({ eventName: "visit_home", path: "/" });

    expect(analyticsEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: "203.0.113.10",
        userAgent: "request-agent/1.0"
      })
    });
  });

  it("still writes null network fields when request headers are unavailable", async () => {
    headersMock.mockRejectedValue(new Error("headers called outside a request scope"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await trackAnalyticsEvent({ eventName: "seo_audit_completed" });

    expect(analyticsEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: null, userAgent: null })
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("uses bounded explicit network context without reading request headers", async () => {
    const ip = `198.51.100.7-${"x".repeat(80)}`;
    const userAgent = `seo-audit-worker/${"y".repeat(600)}`;

    await trackAnalyticsEvent({
      eventName: "seo_audit_completed",
      networkContext: { ip, userAgent }
    });

    expect(headersMock).not.toHaveBeenCalled();
    expect(analyticsEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ip: ip.slice(0, 64),
        userAgent: userAgent.slice(0, 512)
      })
    });
  });

  it("accepts an explicit null network context for background work", async () => {
    await trackAnalyticsEvent({
      eventName: "seo_audit_failed",
      networkContext: { ip: null, userAgent: null }
    });

    expect(headersMock).not.toHaveBeenCalled();
    expect(analyticsEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: null, userAgent: null })
    });
  });

  it("keeps a missing analytics_events table non-blocking", async () => {
    const missingTableError = {
      code: "P2021",
      meta: { table: "public.analytics_events" }
    };
    headersMock.mockResolvedValue(new Headers());
    analyticsEventCreate.mockRejectedValue(missingTableError);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await trackAnalyticsEvent({ eventName: "visit_home" });

    expect(consoleWarn).toHaveBeenCalledWith(
      "[analytics] analytics_events table is missing; event skipped"
    );
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("logs a database write failure without logging the event payload", async () => {
    const databaseError = new Error("database unavailable");
    headersMock.mockResolvedValue(new Headers());
    analyticsEventCreate.mockRejectedValue(databaseError);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await trackAnalyticsEvent({
      eventName: "seo_audit_completed",
      metadata: { runId: "run-1" }
    });

    expect(consoleError).toHaveBeenCalledWith(
      "[analytics] failed to track event",
      databaseError
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("run-1");
  });
});
