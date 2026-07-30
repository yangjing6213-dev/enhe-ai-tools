import { describe, expect, it } from "vitest";
import { getOrderPaymentPresentation } from "@/lib/order-payment-presentation";

describe("order payment presentation", () => {
  it("creates payments for software and both SEO audit order types", () => {
    for (const orderType of ["software_download", "seo_audit_credit", "seo_audit_monitoring"] as const) {
      expect(getOrderPaymentPresentation({ orderType, orderStatus: "pending_payment" }).isZpayPayable).toBe(true);
    }
    expect(getOrderPaymentPresentation({ orderType: "vip", orderStatus: "pending_payment" }).isZpayPayable).toBe(false);
  });

  it("uses the entitlement record as the SEO audit unlock signal", () => {
    expect(getOrderPaymentPresentation({
      orderType: "seo_audit_credit",
      orderStatus: "paid",
      hasSeoAuditCredit: true,
    }).isUnlocked).toBe(true);
    expect(getOrderPaymentPresentation({
      orderType: "seo_audit_monitoring",
      orderStatus: "paid",
      hasSeoAuditSubscriptionOrder: true,
    }).isUnlocked).toBe(true);
  });

  it("does not show refunded or cancelled orders as unlocked", () => {
    expect(getOrderPaymentPresentation({
      orderType: "seo_audit_credit",
      orderStatus: "refunded",
      hasSeoAuditCredit: true,
    }).isUnlocked).toBe(false);
    expect(getOrderPaymentPresentation({
      orderType: "software_download",
      orderStatus: "cancelled",
      hasToolPurchase: true,
    }).isUnlocked).toBe(false);
  });

  it("uses product-specific fulfillment copy", () => {
    expect(getOrderPaymentPresentation({ orderType: "software_download", orderStatus: "pending_payment" }).paymentCompletionText)
      .toBe("支付成功后，自动解锁该软件的下载链接。");
    expect(getOrderPaymentPresentation({ orderType: "seo_audit_credit", orderStatus: "pending_payment" }).paymentCompletionText)
      .toContain("巡检次数");
    expect(getOrderPaymentPresentation({ orderType: "seo_audit_monitoring", orderStatus: "pending_payment" }).paymentCompletionText)
      .toContain("持续监控");
  });
});
