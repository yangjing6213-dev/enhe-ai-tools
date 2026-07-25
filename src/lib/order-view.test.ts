import { describe, expect, it } from "vitest";
import { getOrderBenefitExpiry } from "@/lib/order-view";

describe("order view helpers", () => {
  it("shows unactivated orders without an expiry", () => {
    expect(getOrderBenefitExpiry({ orderType: "vip", activatedAt: null, plan: { durationDays: 7 } })).toBe("未开通");
  });

  it("shows permanent authorization for paid software orders", () => {
    expect(getOrderBenefitExpiry({ orderType: "software_download", activatedAt: new Date("2026-05-20T00:00:00Z") })).toBe("永久授权");
  });

  it("labels SEO audit credits as neither VIP nor permanent authorization", () => {
    expect(
      getOrderBenefitExpiry({
        orderType: "seo_audit_credit",
        activatedAt: new Date("2026-07-25T00:00:00Z")
      })
    ).toBe("巡检次数包（非 VIP、非永久授权）");
  });

  it("labels SEO audit monitoring as neither VIP nor permanent authorization", () => {
    expect(
      getOrderBenefitExpiry({
        orderType: "seo_audit_monitoring",
        activatedAt: new Date("2026-07-25T00:00:00Z")
      })
    ).toBe("监控服务期（非 VIP、非永久授权）");
  });
});
