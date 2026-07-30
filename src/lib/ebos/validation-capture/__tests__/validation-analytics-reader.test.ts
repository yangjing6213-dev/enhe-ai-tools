import { describe, expect, it } from "vitest";
import {
  mapAnalyticsEventsToValidationMetrics,
  readValidationAnalytics,
  summarizeAnalyticsEvents
} from "../validation-analytics-reader";

describe("validation analytics reader", () => {
  it("does not crash when AnalyticsEvent is unavailable", async () => {
    const summary = await readValidationAnalytics({ prismaClient: {} });

    expect(summary.analyticsAvailable).toBe(false);
    expect(summary.eventsDetected).toBe(0);
    expect(summary.warnings.some((warning) => warning.code === "analytics_model_unavailable")).toBe(true);
  });

  it("counts validation CTA events by name", () => {
    const summary = summarizeAnalyticsEvents([
      { eventName: "validation_ai_prompt_kit_cta_click", path: "/validation/ai-prompt-kit" },
      { eventName: "validation_ai_prompt_kit_cta_click", path: "/en/validation/ai-prompt-kit" },
      { eventName: "validation_faceswap_cta_click", path: "/software/faceswap-studio-ai" }
    ]);

    expect(summary.analyticsAvailable).toBe(true);
    expect(summary.eventsDetected).toBe(3);
    expect(summary.ctaClicksDetected).toBe(3);
    expect(summary.eventsByName.validation_ai_prompt_kit_cta_click).toBe(2);
  });

  it("counts page views by validation path", () => {
    const summary = summarizeAnalyticsEvents([
      { eventName: "page_view", path: "/validation/ai-prompt-kit" },
      { eventName: "route_view", path: "/validation/ai-prompt-kit?utm=test" },
      { eventName: "analytics_page_view", path: "/software/faceswap-studio-ai" }
    ]);

    expect(summary.pageViewsDetected).toBe(3);
    expect(summary.eventsByPath["/validation/ai-prompt-kit"]).toBe(2);
    expect(summary.eventsByPath["/software/faceswap-studio-ai"]).toBe(1);
  });

  it("returns warning when database query fails", async () => {
    const summary = await readValidationAnalytics({
      prismaClient: {
        analyticsEvent: {
          findMany: async () => {
            throw new Error("database unavailable");
          }
        }
      }
    });

    expect(summary.analyticsAvailable).toBe(false);
    expect(summary.eventsDetected).toBe(0);
    expect(summary.warnings.some((warning) => warning.code === "analytics_query_failed")).toBe(true);
  });

  it("maps analytics events into validation plan metrics", () => {
    const metrics = mapAnalyticsEventsToValidationMetrics([
      { eventName: "validation_ai_prompt_kit_cta_click", path: "/validation/ai-prompt-kit" },
      { eventName: "page_view", path: "/validation/ai-prompt-kit" },
      { eventName: "validation_faceswap_cta_click", path: "/software/faceswap-studio-ai" },
      { eventName: "validation_ai_video_cta_click", path: "/software/local-ai-video-studio-for-creator-workflows" }
    ]);

    expect(metrics["validation-direction-3-ai-prompt-kit"]?.ctaClicks).toBe(1);
    expect(metrics["validation-direction-3-ai-prompt-kit"]?.pageViews).toBe(1);
    expect(metrics["validation-product-1-faceswap-studio-ai"]?.productPageCtaClicks).toBe(1);
    expect(metrics["validation-product-2-local-ai-video-studio-for-creator-workflows"]?.productPageCtaClicks).toBe(1);
  });

  it("computes the SEO audit funnel by trusted event and acquisition context", () => {
    const summary = summarizeAnalyticsEvents([
      {
        eventName: "seo_audit_landing_view",
        metadata: {
          eventTrust: "client",
          clientId: "client-1",
          sessionId: "session-1",
          source: "xiaohongshu",
          medium: "organic_social",
          campaign: "launch-week",
          offerId: "seo-audit-professional"
        }
      },
      {
        eventName: "seo_audit_completed",
        metadata: {
          eventTrust: "server",
          clientId: "client-1",
          sessionId: "session-1",
          source: "xiaohongshu",
          medium: "organic_social",
          campaign: "launch-week",
          offerId: "seo-audit-professional"
        }
      },
      {
        eventName: "seo_audit_purchased",
        metadata: {
          eventTrust: "server",
          clientId: "client-1",
          sessionId: "session-1",
          source: "xiaohongshu",
          medium: "organic_social",
          campaign: "launch-week",
          offerId: "seo-audit-professional",
          orderId: "order-1"
        }
      },
      {
        eventName: "seo_audit_purchased",
        metadata: {
          eventTrust: "client",
          clientId: "attacker",
          sessionId: "forged",
          orderId: "forged-order"
        }
      }
    ]);

    expect(summary.seoAuditFunnel?.counts).toMatchObject({
      seo_audit_landing_view: 1,
      seo_audit_completed: 1,
      seo_audit_purchased: 1
    });
    expect(summary.seoAuditFunnel?.completedScans).toBe(1);
    expect(summary.seoAuditFunnel?.channels).toContainEqual(expect.objectContaining({
      source: "xiaohongshu",
      medium: "organic_social",
      campaign: "launch-week",
      offerId: "seo-audit-professional",
      paymentSucceeded: 1
    }));
  });
});
