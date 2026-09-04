import { describe, expect, test } from "vitest";
import {
  attributeValidationResultsByChannel,
  summarizeManualOutreachResults,
  summarizeMarketplaceResults,
  summarizePricingTestResults,
  summarizeProductPageResults
} from "../validation-channel-attribution";

describe("validation channel attribution", () => {
  test("summarizes marketplace listing fields", () => {
    const summary = summarizeMarketplaceResults({
      planId: "plan-1",
      status: "completed",
      listingViews: 100,
      clicks: 12,
      favorites: 4,
      messages: 3,
      orders: 1,
      revenue: 99
    });

    expect(summary.channel).toBe("marketplace_listing");
    expect(summary.status).toBe("converted");
    expect(summary.metrics).toMatchObject({
      listingViews: 100,
      clicks: 12,
      favorites: 4,
      messages: 3,
      orders: 1,
      revenue: 99
    });
  });

  test("summarizes product page fields and recommends offer optimization when clicks do not become leads", () => {
    const summary = summarizeProductPageResults({
      planId: "plan-1",
      status: "completed",
      productPageViews: 120,
      productPageCtaClicks: 14,
      ctaClicks: 14,
      leads: 0,
      paidOrders: 0
    });

    expect(summary.channel).toBe("product_page");
    expect(summary.status).toBe("engaged");
    expect(summary.recommendations.join(" ")).toContain("offer");
    expect(summary.recommendations.join(" ")).toContain("trust");
  });

  test("summarizes manual outreach fields", () => {
    const summary = summarizeManualOutreachResults({
      planId: "plan-1",
      status: "completed",
      manualOutreachCount: 20,
      positiveReplies: 3,
      negativeReplies: 2,
      callsBooked: 1,
      orders: 0
    });

    expect(summary.channel).toBe("manual_outreach");
    expect(summary.status).toBe("engaged");
    expect(summary.metrics).toMatchObject({
      manualOutreachCount: 20,
      positiveReplies: 3,
      negativeReplies: 2,
      callsBooked: 1,
      orders: 0
    });
  });

  test("summarizes pricing test fields and recommends refund analysis", () => {
    const summary = summarizePricingTestResults({
      planId: "plan-1",
      status: "completed",
      priceShown: "$29",
      ctaClicks: 8,
      paidOrders: 1,
      refundCount: 1,
      feedback: ["Too expensive"]
    });

    expect(summary.channel).toBe("pricing_test");
    expect(summary.status).toBe("refund_risk");
    expect(summary.recommendations.join(" ")).toContain("refund");
    expect(summary.recommendations.join(" ")).toContain("expectation");
  });

  test("marks missing channel fields as no data", () => {
    const summary = summarizeMarketplaceResults({
      planId: "plan-1",
      status: "not_started"
    });

    expect(summary.status).toBe("no_data");
    expect(summary.recommendations).toContain("Record marketplace listing views, clicks, favorites, messages, orders, and revenue before judging this channel.");
  });

  test("recommends title, cover, and CTA optimization when exposure has no clicks", () => {
    const summary = summarizeMarketplaceResults({
      planId: "plan-1",
      status: "completed",
      listingViews: 80,
      clicks: 0,
      messages: 0,
      orders: 0
    });

    expect(summary.status).toBe("exposure_only");
    expect(summary.recommendations.join(" ")).toContain("title");
    expect(summary.recommendations.join(" ")).toContain("cover");
    expect(summary.recommendations.join(" ")).toContain("CTA");
  });

  test("attributes all supported channels for one plan", () => {
    const attribution = attributeValidationResultsByChannel({
      planId: "plan-1",
      status: "completed",
      productPageViews: 50,
      productPageCtaClicks: 11,
      listingViews: 30,
      messages: 2,
      priceShown: "$29",
      paidOrders: 0,
      refundCount: 0
    });

    expect(attribution.planId).toBe("plan-1");
    expect(attribution.channels.map((channel) => channel.channel)).toEqual([
      "marketplace_listing",
      "product_page",
      "manual_outreach",
      "pricing_test"
    ]);
    expect(attribution.recommendations.length).toBeGreaterThan(0);
  });
});
