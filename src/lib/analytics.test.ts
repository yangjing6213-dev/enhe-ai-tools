import { describe, expect, it } from "vitest";
import {
  analyticsFunnelSteps,
  buildAnalyticsFunnel,
  getPageViewEventName,
  isAnalyticsEventName,
  isMissingAnalyticsStorageError
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
    expect(isAnalyticsEventName("unknown_event")).toBe(false);
  });

  it("recognizes missing analytics storage errors as non-blocking", () => {
    expect(isMissingAnalyticsStorageError({ code: "P2021", meta: { table: "public.analytics_events" } })).toBe(true);
    expect(isMissingAnalyticsStorageError({ code: "P2002" })).toBe(false);
    expect(isMissingAnalyticsStorageError(new Error("other failure"))).toBe(false);
  });
});
