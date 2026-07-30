import { describe, expect, it } from "vitest";
import {
  assertAdminOrderStatusUpdateAllowed,
  assertAdminOrderFinancialUpdateAllowed,
  canRecordRefundForOrder,
  canUserCancelOrder,
  canUserRequestRefundForOrder,
  getRefundBenefitUsageScopes,
  getRefundRecordActorLabel,
  getRefundStatusPatch,
  hasExistingRefundAttempt,
  normalizeRefundRecordAmount
} from "@/lib/order-rules";

describe("order business rules", () => {
  it("allows users to cancel only pending or rejected orders", () => {
    expect(canUserCancelOrder("pending_payment")).toBe(true);
    expect(canUserCancelOrder("pending_review")).toBe(true);
    expect(canUserCancelOrder("rejected")).toBe(true);
    expect(canUserCancelOrder("paid")).toBe(false);
    expect(canUserCancelOrder("activated")).toBe(false);
    expect(canUserCancelOrder("refunded")).toBe(false);
  });

  it("blocks admin status edits that would bypass entitlement activation", () => {
    expect(() => assertAdminOrderStatusUpdateAllowed("activated")).toThrow("不能通过手动改状态");
    expect(() => assertAdminOrderStatusUpdateAllowed("cancelled")).not.toThrow();
  });

  it("allows saving an already activated order without changing its status", () => {
    expect(() => assertAdminOrderStatusUpdateAllowed("activated", "activated")).not.toThrow();
    expect(() => assertAdminOrderStatusUpdateAllowed("activated", "paid")).toThrow();
  });

  it("allows a refund record only for a currently paid or activated order", () => {
    expect(canRecordRefundForOrder("paid")).toBe(true);
    expect(canRecordRefundForOrder("activated")).toBe(true);
    expect(canRecordRefundForOrder("refunded")).toBe(false);
    expect(canRecordRefundForOrder("pending_payment")).toBe(false);
    expect(canRecordRefundForOrder("pending_review")).toBe(false);
    expect(canRecordRefundForOrder("cancelled")).toBe(false);
    expect(canRecordRefundForOrder("rejected")).toBe(false);
  });

  it("allows users to request refunds only before any refund attempt", () => {
    expect(canUserRequestRefundForOrder("paid", false)).toBe(true);
    expect(canUserRequestRefundForOrder("activated", false)).toBe(true);
    expect(canUserRequestRefundForOrder("paid", true)).toBe(false);
    expect(canUserRequestRefundForOrder("activated", false, true)).toBe(false);
    expect(canUserRequestRefundForOrder("refunded", false)).toBe(false);
    expect(canUserRequestRefundForOrder("pending_payment", false)).toBe(false);
  });

  it("detects refund attempts from records and provider state, including provider rejection", () => {
    expect(hasExistingRefundAttempt({ refundRecordCount: 0 })).toBe(false);
    expect(hasExistingRefundAttempt({ refundRecordCount: 1 })).toBe(true);
    expect(hasExistingRefundAttempt({
      refundRecordCount: 0,
      paymentRefundRecordId: "refund-1"
    })).toBe(true);
    expect(hasExistingRefundAttempt({
      refundRecordCount: 0,
      paymentRefundState: "provider_rejected"
    })).toBe(true);
  });

  it("scopes VIP benefit usage to the user and entitlement start", () => {
    const benefitStart = new Date("2026-07-01T00:00:00.000Z");

    expect(getRefundBenefitUsageScopes({
      orderType: "vip",
      orderId: "order-1",
      userId: "user-1",
      toolId: null,
      benefitStart
    })).toEqual({
      isVerifiable: true,
      downloadLog: { userId: "user-1", createdAt: { gte: benefitStart } },
      toolUsageLog: { userId: "user-1", createdAt: { gte: benefitStart } },
      seoAuditRun: null
    });
  });

  it("scopes software benefit usage to its tool and entitlement start", () => {
    const benefitStart = new Date("2026-07-01T00:00:00.000Z");

    expect(getRefundBenefitUsageScopes({
      orderType: "software_download",
      orderId: "order-1",
      userId: "user-1",
      toolId: "tool-1",
      benefitStart
    })).toEqual({
      isVerifiable: true,
      downloadLog: { userId: "user-1", toolId: "tool-1", createdAt: { gte: benefitStart } },
      toolUsageLog: { userId: "user-1", toolId: "tool-1", createdAt: { gte: benefitStart } },
      seoAuditRun: null
    });
  });

  it.each(["seo_audit_credit", "seo_audit_monitoring"] as const)(
    "scopes %s benefit usage only to funded runs from the order",
    (orderType) => {
      expect(getRefundBenefitUsageScopes({
        orderType,
        orderId: "order-1",
        userId: "user-1",
        toolId: null,
        benefitStart: new Date("2026-07-01T00:00:00.000Z")
      })).toEqual({
        isVerifiable: true,
        downloadLog: null,
        toolUsageLog: null,
        seoAuditRun: { sourceOrderId: "order-1" }
      });
    }
  );

  it("fails closed when a software order has no tool binding", () => {
    expect(getRefundBenefitUsageScopes({
      orderType: "software_download",
      orderId: "order-1",
      userId: "user-1",
      toolId: null,
      benefitStart: new Date("2026-07-01T00:00:00.000Z")
    })).toEqual({
      isVerifiable: false,
      downloadLog: null,
      toolUsageLog: null,
      seoAuditRun: null
    });
  });

  it("labels refund actors for admin-created and user-requested records", () => {
    expect(getRefundRecordActorLabel({ adminEmail: "admin@example.com", requesterEmail: null })).toBe("admin@example.com");
    expect(getRefundRecordActorLabel({ adminEmail: null, requesterEmail: "user@example.com" })).toBe("用户申请：user@example.com");
    expect(getRefundRecordActorLabel({ adminEmail: null, requesterEmail: null })).toBe("系统记录");
  });

  it("accepts only a full refund amount equal to the paid order amount", () => {
    expect(normalizeRefundRecordAmount("19.90", 19.9)).toBe(19.9);
    expect(() => normalizeRefundRecordAmount("0", 20)).toThrow("Refund amount must be greater than 0.");
    expect(() => normalizeRefundRecordAmount("21", 20)).toThrow("Refund amount cannot exceed order amount.");
    expect(() => normalizeRefundRecordAmount("12.35", 20)).toThrow("Refund amount must equal order amount.");
  });

  it("prevents manual refunded transitions and amount edits after payment creation", () => {
    expect(() => assertAdminOrderStatusUpdateAllowed("refunded", "paid")).toThrow(
      "Refunded status must be set by the refund workflow."
    );
    expect(() => assertAdminOrderStatusUpdateAllowed("refunded", "refunded")).not.toThrow();
    expect(() =>
      assertAdminOrderFinancialUpdateAllowed({
        hasPaymentTransaction: true,
        currentAmount: 19.9,
        nextAmount: 20
      })
    ).toThrow("Order amount cannot change after payment creation.");
    expect(() =>
      assertAdminOrderFinancialUpdateAllowed({
        hasPaymentTransaction: true,
        currentAmount: 19.9,
        nextAmount: 19.9
      })
    ).not.toThrow();
  });

  it("stamps completed refunds and clears completion date for non-completed decisions", () => {
    const now = new Date("2026-05-25T08:00:00.000Z");
    expect(getRefundStatusPatch("completed", null, now)).toEqual({ completedAt: now });
    expect(getRefundStatusPatch("completed", new Date("2026-05-20T00:00:00.000Z"), now)).toEqual({
      completedAt: new Date("2026-05-20T00:00:00.000Z")
    });
    expect(getRefundStatusPatch("pending", now, now)).toEqual({ completedAt: null });
    expect(getRefundStatusPatch("rejected", now, now)).toEqual({ completedAt: null });
  });
});
