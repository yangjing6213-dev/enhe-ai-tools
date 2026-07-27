import { describe, expect, it } from "vitest";
import {
  analyticsFunnelSteps,
  buildAnalyticsFunnel,
  getPageViewEventName,
  isAnalyticsEventName,
  isClientAnalyticsEventName,
  isMissingAnalyticsStorageError,
  organicConversionFunnelSteps
} from "@/lib/analytics";

describe("analytics funnel helpers", () => {
  it("maps important pages to launch funnel events", () => {
    expect(getPageViewEventName("/")).toBe("visit_home");
    expect(getPageViewEventName("/en")).toBe("visit_home");
    expect(getPageViewEventName("/software/faceswap-studio")).toBe("view_tool");
    expect(getPageViewEventName("/en/software/faceswap-studio")).toBe("view_tool");
    expect(getPageViewEventName("/skill-learning/prompt-engineering")).toBe("view_tool");
    expect(getPageViewEventName("/account-services/chatgpt-plus")).toBe("view_tool");
    expect(getPageViewEventName("/tools/faceswap-studio")).toBe("view_tool");
    expect(getPageViewEventName("/pricing")).toBe("view_pricing");
    expect(getPageViewEventName("/en/pricing")).toBe("view_pricing");
    expect(getPageViewEventName("/user")).toBe("view_user_center");
  });

  it("defines an organic conversion funnel without replacing the existing order funnel", () => {
    expect(organicConversionFunnelSteps).toEqual([
      "seo_landing_view",
      "content_to_product_click",
      "view_tool",
      "product_purchase_cta_click",
      "begin_checkout",
      "create_order",
      "payment_proof_submitted",
      "payment_review_approved"
    ]);
    expect(analyticsFunnelSteps).toContain("view_tool");
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
    expect(isAnalyticsEventName("content_to_product_click")).toBe(true);
    expect(isAnalyticsEventName("product_purchase_cta_click")).toBe(true);
    expect(isAnalyticsEventName("product_use_cta_click")).toBe(true);
    expect(isAnalyticsEventName("begin_checkout")).toBe(true);
    expect(isAnalyticsEventName("product_download_click")).toBe(true);
    expect(isAnalyticsEventName("home_ai_news_cta_click")).toBe(true);
    expect(isAnalyticsEventName("home_free_claim_cta_click")).toBe(true);
    expect(isAnalyticsEventName("home_hot_ai_tools_cta_click")).toBe(true);
    expect(isAnalyticsEventName("validation_ai_prompt_kit_cta_click")).toBe(true);
    expect(isAnalyticsEventName("validation_faceswap_cta_click")).toBe(true);
    expect(isAnalyticsEventName("validation_ai_video_cta_click")).toBe(true);
    expect(isAnalyticsEventName("unknown_event")).toBe(false);
    expect(isClientAnalyticsEventName("home_account_services_cta_click")).toBe(true);
    expect(isClientAnalyticsEventName("home_task_outcome_click")).toBe(true);
    expect(isClientAnalyticsEventName("home_tool_finder_cta_click")).toBe(true);
    expect(isClientAnalyticsEventName("home_practical_ai_learning_click")).toBe(true);
    expect(isClientAnalyticsEventName("payment_review_approved")).toBe(false);
    expect(isClientAnalyticsEventName("create_order")).toBe(false);
  });

  it("recognizes missing analytics storage errors as non-blocking", () => {
    expect(isMissingAnalyticsStorageError({ code: "P2021", meta: { table: "public.analytics_events" } })).toBe(true);
    expect(isMissingAnalyticsStorageError({ code: "P2002" })).toBe(false);
    expect(isMissingAnalyticsStorageError(new Error("other failure"))).toBe(false);
  });
});
