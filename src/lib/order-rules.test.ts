import { describe, expect, it } from "vitest";
import {
  assertAdminOrderStatusUpdateAllowed,
  canAdminDeleteOrderSafely,
  canRecordRefundForOrder,
  canUserCancelOrder,
  canUserRequestRefundForOrder,
  getRefundRecordActorLabel,
  getRefundStatusPatch,
  isAdminDeleteRiskConfirmed,
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

  it("marks activated, paid, and refunded orders as risky to delete", () => {
    expect(canAdminDeleteOrderSafely("activated")).toBe(false);
    expect(canAdminDeleteOrderSafely("paid")).toBe(false);
    expect(canAdminDeleteOrderSafely("refunded")).toBe(false);
    expect(canAdminDeleteOrderSafely("cancelled")).toBe(true);
  });

  it("requires an explicit confirmation token before deleting risky orders", () => {
    expect(isAdminDeleteRiskConfirmed(null)).toBe(false);
    expect(isAdminDeleteRiskConfirmed("wrong")).toBe(false);
    expect(isAdminDeleteRiskConfirmed("DELETE_ACTIVATED_ORDER")).toBe(true);
  });

  it("allows refund records only for paid, activated, or already refunded orders", () => {
    expect(canRecordRefundForOrder("paid")).toBe(true);
    expect(canRecordRefundForOrder("activated")).toBe(true);
    expect(canRecordRefundForOrder("refunded")).toBe(true);
    expect(canRecordRefundForOrder("pending_payment")).toBe(false);
    expect(canRecordRefundForOrder("pending_review")).toBe(false);
    expect(canRecordRefundForOrder("cancelled")).toBe(false);
    expect(canRecordRefundForOrder("rejected")).toBe(false);
  });

  it("allows users to request refunds only before a final refund decision", () => {
    expect(canUserRequestRefundForOrder("paid", false)).toBe(true);
    expect(canUserRequestRefundForOrder("activated", false)).toBe(true);
    expect(canUserRequestRefundForOrder("paid", true)).toBe(false);
    expect(canUserRequestRefundForOrder("activated", false, true)).toBe(false);
    expect(canUserRequestRefundForOrder("refunded", false)).toBe(false);
    expect(canUserRequestRefundForOrder("pending_payment", false)).toBe(false);
  });

  it("labels refund actors for admin-created and user-requested records", () => {
    expect(getRefundRecordActorLabel({ adminEmail: "admin@example.com", requesterEmail: null })).toBe("admin@example.com");
    expect(getRefundRecordActorLabel({ adminEmail: null, requesterEmail: "user@example.com" })).toBe("用户申请：user@example.com");
    expect(getRefundRecordActorLabel({ adminEmail: null, requesterEmail: null })).toBe("系统记录");
  });

  it("normalizes refund record amounts without exceeding the order amount", () => {
    expect(normalizeRefundRecordAmount("12.345", 20)).toBe(12.35);
    expect(() => normalizeRefundRecordAmount("0", 20)).toThrow("Refund amount must be greater than 0.");
    expect(() => normalizeRefundRecordAmount("21", 20)).toThrow("Refund amount cannot exceed order amount.");
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
