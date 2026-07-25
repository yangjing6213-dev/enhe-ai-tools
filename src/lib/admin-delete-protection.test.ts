import { describe, expect, it } from "vitest";
import {
  decideAdminOrderHardDelete,
  decideAdminToolHardDelete,
  decideAdminUserHardDelete,
  getAdminDeleteConflictCode,
} from "@/lib/admin-delete-protection";

const emptyOrderCounts = {
  paymentTransaction: 0,
  paymentProof: 0,
  refundRecords: 0,
  toolPurchase: 0,
  seoAuditCredit: 0,
  seoAuditSubscriptionOrder: 0,
  seoAuditRuns: 0,
};

const emptyUserCounts = {
  orders: 0,
  memberships: 0,
  paymentProofs: 0,
  reviewedProofs: 0,
  comments: 0,
  downloadLogs: 0,
  toolUsageLogs: 0,
  analyticsEvents: 0,
  toolPurchases: 0,
  vipAdjustments: 0,
  vipOperations: 0,
  refundRecords: 0,
  refundRequests: 0,
  adminAuditLogs: 0,
  sessions: 0,
  notifications: 0,
  newsFavorites: 0,
  newsLikes: 0,
  seoAuditProjects: 0,
  seoAuditRuns: 0,
  seoAuditCredits: 0,
  seoAuditSubscriptions: 0,
};

describe("admin hard-delete protection", () => {
  it("allows only a relationship-free cancelled order", () => {
    expect(
      decideAdminOrderHardDelete({
        orderStatus: "cancelled",
        isTestData: true,
        protectedCounts: emptyOrderCounts,
      }),
    ).toEqual({ allowed: true });

    expect(
      decideAdminOrderHardDelete({
        orderStatus: "pending_payment",
        isTestData: true,
        protectedCounts: emptyOrderCounts,
      }),
    ).toEqual({ allowed: false, code: "ADMIN_ORDER_DELETE_NOT_CANCELLED" });
  });

  it("blocks non-test orders with a stable error code", () => {
    expect(
      decideAdminOrderHardDelete({
        orderStatus: "cancelled",
        isTestData: false,
        protectedCounts: emptyOrderCounts,
      }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_ORDER_DELETE_NOT_TEST_DATA",
    });
  });

  it.each([
    "paymentTransaction",
    "paymentProof",
    "refundRecords",
    "toolPurchase",
    "seoAuditCredit",
    "seoAuditSubscriptionOrder",
    "seoAuditRuns",
  ] as const)("blocks deleting an order with protected %s records", (field) => {
    expect(
      decideAdminOrderHardDelete({
        orderStatus: "cancelled",
        isTestData: true,
        protectedCounts: { ...emptyOrderCounts, [field]: 1 },
      }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_ORDER_DELETE_PROTECTED_RECORDS",
    });
  });

  it("blocks a user with financial, entitlement, report, or admin audit ownership", () => {
    expect(
      decideAdminUserHardDelete({
        isTestData: true,
        protectedCounts: { ...emptyUserCounts, seoAuditRuns: 1 },
      }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_USER_DELETE_PROTECTED_RECORDS",
      fallback: "disable",
    });

    expect(
      decideAdminUserHardDelete({
        isTestData: true,
        protectedCounts: { ...emptyUserCounts, refundRecords: 1 },
      }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_USER_DELETE_PROTECTED_RECORDS",
      fallback: "disable",
    });
  });

  it("allows hard deletion only for a user without protected relations", () => {
    expect(
      decideAdminUserHardDelete({
        isTestData: true,
        protectedCounts: emptyUserCounts,
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks and disables non-test users with a stable error code", () => {
    expect(
      decideAdminUserHardDelete({
        isTestData: false,
        protectedCounts: emptyUserCounts,
      }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_USER_DELETE_NOT_TEST_DATA",
      fallback: "disable",
    });
  });

  it("blocks tools with orders or purchase entitlements", () => {
    expect(
      decideAdminToolHardDelete({ orders: 1, purchases: 0 }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_TOOL_DELETE_PROTECTED_RECORDS",
    });
    expect(
      decideAdminToolHardDelete({ orders: 0, purchases: 1 }),
    ).toEqual({
      allowed: false,
      code: "ADMIN_TOOL_DELETE_PROTECTED_RECORDS",
    });
    expect(
      decideAdminToolHardDelete({ orders: 0, purchases: 0 }),
    ).toEqual({ allowed: true });
  });

  it("maps concurrent foreign-key failures to the stable admin error code", () => {
    expect(getAdminDeleteConflictCode({ code: "P2003" })).toBe(
      "ADMIN_DELETE_CONFLICT",
    );
    expect(getAdminDeleteConflictCode({ code: "P2014" })).toBe(
      "ADMIN_DELETE_CONFLICT",
    );
    expect(getAdminDeleteConflictCode(new Error("other"))).toBeNull();
  });
});
