import { describe, expect, it } from "vitest";
import type { EbosValidationInputFile } from "../../validation";
import { buildValidationAutofillChanges, createManualDataSlots, mapCaptureToValidationInput } from "../validation-autofill-mapper";
import type { EbosValidationCaptureReport } from "../validation-capture-types";

const baseInput: EbosValidationInputFile = {
  results: [
    { planId: "validation-product-1-faceswap-studio-ai", status: "running", productPageCtaClicks: 0, ctaClicks: 0, paidOrders: 0, refundCount: 0, notes: "keep me" },
    { planId: "validation-product-2-local-ai-video-studio-for-creator-workflows", status: "running", productPageCtaClicks: 0, ctaClicks: 0, paidOrders: 0, refundCount: 0 },
    { planId: "validation-direction-3-ai-prompt-kit", status: "running", pageViews: 0, ctaClicks: 0, paidOrders: 0, revenue: 0 }
  ]
};

function capture(overrides: Partial<EbosValidationCaptureReport> = {}): EbosValidationCaptureReport {
  return {
    reportType: "validation_capture_report",
    targetDate: "2026-07-03",
    generatedAt: "2026-07-03T00:00:00.000Z",
    periodStart: "2026-06-29",
    periodEnd: "2026-07-05",
    inputPath: "reports/ebos/validation/inputs/2026-07-03-validation-input.json",
    analyticsSummary: {
      analyticsAvailable: true,
      eventsDetected: 4,
      pageViewsDetected: 1,
      ctaClicksDetected: 3,
      eventsByName: {
        validation_ai_prompt_kit_cta_click: 1,
        validation_faceswap_cta_click: 1,
        validation_ai_video_cta_click: 1
      },
      eventsByPath: {
        "/validation/ai-prompt-kit": 1
      },
      warnings: []
    },
    orderSummary: {
      ordersAvailable: true,
      totalOrders: 0,
      paidOrders: 0,
      revenue: 0,
      refundedAmount: 0,
      refundCount: 0,
      ordersByProductOrSlug: {},
      warnings: []
    },
    autofillSummary: {
      candidateChanges: 0,
      applicableChanges: 0,
      skippedChanges: 0,
      appliedChanges: 0
    },
    manualDataSlots: [],
    appliedChanges: [],
    skippedChanges: [],
    warnings: [],
    ...overrides
  };
}

describe("validation autofill mapper", () => {
  it("maps AI Prompt Kit CTA click into ctaClicks", () => {
    const changes = buildValidationAutofillChanges({ capture: capture(), input: baseInput });

    expect(changes).toContainEqual(expect.objectContaining({
      planId: "validation-direction-3-ai-prompt-kit",
      field: "ctaClicks",
      newValue: 1
    }));
  });

  it("maps FaceSwap CTA click into productPageCtaClicks", () => {
    const changes = buildValidationAutofillChanges({ capture: capture(), input: baseInput });

    expect(changes).toContainEqual(expect.objectContaining({
      planId: "validation-product-1-faceswap-studio-ai",
      field: "productPageCtaClicks",
      newValue: 1
    }));
  });

  it("maps AI Video CTA click into productPageCtaClicks", () => {
    const changes = buildValidationAutofillChanges({ capture: capture(), input: baseInput });

    expect(changes).toContainEqual(expect.objectContaining({
      planId: "validation-product-2-local-ai-video-studio-for-creator-workflows",
      field: "productPageCtaClicks",
      newValue: 1
    }));
  });

  it("does not overwrite an existing higher value", () => {
    const input: EbosValidationInputFile = {
      results: [{ planId: "validation-direction-3-ai-prompt-kit", status: "running", ctaClicks: 5 }]
    };
    const mapped = mapCaptureToValidationInput(capture(), input);

    expect(mapped.results[0]?.ctaClicks).toBe(5);
  });

  it("maps SEO audit completed scans and order risk counters", () => {
    const input: EbosValidationInputFile = {
      results: [{
        planId: "validation-product-seo-geo-audit",
        status: "running",
        completedScans: 0,
        paidOrders: 0,
        refundCount: 0,
        pendingRefundOrders: 0,
        undeliveredPaidOrders: 0
      }]
    };
    const seoCapture = capture({
      analyticsSummary: {
        analyticsAvailable: true,
        eventsDetected: 5,
        pageViewsDetected: 1,
        ctaClicksDetected: 1,
        eventsByName: {},
        eventsByPath: {},
        seoAuditFunnel: {
          counts: {
            seo_audit_landing_view: 1,
            seo_audit_submitted: 1,
            seo_audit_completed: 2,
            seo_audit_failed: 0,
            seo_audit_summary_viewed: 0,
            seo_audit_paywall_viewed: 1,
            seo_audit_checkout_started: 0,
            seo_audit_purchased: 0,
            seo_audit_report_downloaded: 0,
            seo_audit_prompt_copied: 0,
            seo_audit_recheck_started: 0,
            seo_audit_monitoring_viewed: 0,
            seo_audit_monitoring_purchased: 0,
            seo_audit_schedule_enabled: 0,
            seo_audit_schedule_paused: 0
          },
          completedScans: 2,
          channels: []
        },
        warnings: []
      },
      orderSummary: {
        ordersAvailable: true,
        totalOrders: 3,
        paidOrders: 1,
        revenue: 9.9,
        refundedAmount: 9.9,
        refundCount: 1,
        pendingRefundOrders: 1,
        undeliveredPaidOrders: 1,
        ordersByProductOrSlug: {
          "seo-audit": {
            totalOrders: 3,
            paidOrders: 1,
            revenue: 9.9,
            refundedAmount: 9.9,
            refundCount: 1,
            pendingRefundOrders: 1,
            undeliveredPaidOrders: 1
          }
        },
        warnings: []
      }
    });

    const mapped = mapCaptureToValidationInput(seoCapture, input);

    expect(mapped.results[0]).toMatchObject({
      completedScans: 2,
      paidOrders: 1,
      refundCount: 1,
      pendingRefundOrders: 1,
      undeliveredPaidOrders: 1
    });
  });

  it("generates manual slots for external channel data", () => {
    const slots = createManualDataSlots(baseInput);

    expect(slots.map((slot) => slot.field)).toEqual(expect.arrayContaining([
      "listingViews",
      "messages",
      "favorites",
      "manualOutreachCount",
      "positiveReplies",
      "userFeedback",
      "channelResults"
    ]));
  });

  it("does not mark empty capture data as failed", () => {
    const emptyCapture = capture({
      analyticsSummary: {
        analyticsAvailable: true,
        eventsDetected: 0,
        pageViewsDetected: 0,
        ctaClicksDetected: 0,
        eventsByName: {},
        eventsByPath: {},
        warnings: []
      }
    });
    const mapped = mapCaptureToValidationInput(emptyCapture, baseInput);

    expect(mapped.results.every((result) => result.status === "running")).toBe(true);
  });
});
