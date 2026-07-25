import type { OrderStatus } from "@prisma/client";

export const ADMIN_ORDER_DELETE_PROTECTED_RECORDS =
  "ADMIN_ORDER_DELETE_PROTECTED_RECORDS" as const;
export const ADMIN_ORDER_DELETE_NOT_CANCELLED =
  "ADMIN_ORDER_DELETE_NOT_CANCELLED" as const;
export const ADMIN_ORDER_DELETE_NOT_TEST_DATA =
  "ADMIN_ORDER_DELETE_NOT_TEST_DATA" as const;
export const ADMIN_USER_DELETE_PROTECTED_RECORDS =
  "ADMIN_USER_DELETE_PROTECTED_RECORDS" as const;
export const ADMIN_USER_DELETE_NOT_TEST_DATA =
  "ADMIN_USER_DELETE_NOT_TEST_DATA" as const;
export const ADMIN_TOOL_DELETE_PROTECTED_RECORDS =
  "ADMIN_TOOL_DELETE_PROTECTED_RECORDS" as const;
export const ADMIN_DELETE_CONFLICT = "ADMIN_DELETE_CONFLICT" as const;

export type AdminOrderProtectedCounts = {
  paymentTransaction: number;
  paymentProof: number;
  refundRecords: number;
  toolPurchase: number;
  seoAuditCredit: number;
  seoAuditSubscriptionOrder: number;
  seoAuditRuns: number;
};

export type AdminUserProtectedCounts = {
  orders: number;
  memberships: number;
  paymentProofs: number;
  reviewedProofs: number;
  comments: number;
  downloadLogs: number;
  toolUsageLogs: number;
  analyticsEvents: number;
  toolPurchases: number;
  vipAdjustments: number;
  vipOperations: number;
  refundRecords: number;
  refundRequests: number;
  adminAuditLogs: number;
  sessions: number;
  notifications: number;
  newsFavorites: number;
  newsLikes: number;
  seoAuditProjects: number;
  seoAuditRuns: number;
  seoAuditCredits: number;
  seoAuditSubscriptions: number;
};

function hasProtectedRecords(
  counts: AdminOrderProtectedCounts | AdminUserProtectedCounts,
) {
  return Object.values(counts).some((count) => count > 0);
}

export function decideAdminOrderHardDelete(input: {
  orderStatus: OrderStatus;
  isTestData: boolean;
  protectedCounts: AdminOrderProtectedCounts;
}) {
  if (!input.isTestData) {
    return {
      allowed: false as const,
      code: ADMIN_ORDER_DELETE_NOT_TEST_DATA,
    };
  }
  if (hasProtectedRecords(input.protectedCounts)) {
    return {
      allowed: false as const,
      code: ADMIN_ORDER_DELETE_PROTECTED_RECORDS,
    };
  }
  if (input.orderStatus !== "cancelled") {
    return {
      allowed: false as const,
      code: ADMIN_ORDER_DELETE_NOT_CANCELLED,
    };
  }
  return { allowed: true as const };
}

export function decideAdminUserHardDelete(input: {
  isTestData: boolean;
  protectedCounts: AdminUserProtectedCounts;
}) {
  if (!input.isTestData) {
    return {
      allowed: false as const,
      code: ADMIN_USER_DELETE_NOT_TEST_DATA,
      fallback: "disable" as const,
    };
  }
  if (hasProtectedRecords(input.protectedCounts)) {
    return {
      allowed: false as const,
      code: ADMIN_USER_DELETE_PROTECTED_RECORDS,
      fallback: "disable" as const,
    };
  }
  return { allowed: true as const };
}

export function decideAdminToolHardDelete(input: {
  orders: number;
  purchases: number;
}) {
  if (input.orders > 0 || input.purchases > 0) {
    return {
      allowed: false as const,
      code: ADMIN_TOOL_DELETE_PROTECTED_RECORDS,
    };
  }
  return { allowed: true as const };
}

export function getAdminDeleteConflictCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "P2003" || error.code === "P2014" || error.code === "P2034")
  ) {
    return ADMIN_DELETE_CONFLICT;
  }
  return null;
}
