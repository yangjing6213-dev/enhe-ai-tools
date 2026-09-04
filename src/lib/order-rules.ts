import type { OrderStatus, RefundStatus } from "@prisma/client";

export const userCancellableOrderStatuses = ["pending_payment", "pending_review", "rejected"] as const;
export const adminDeleteRiskConfirmationToken = "DELETE_ACTIVATED_ORDER";
export const refundableOrderStatuses = ["paid", "activated", "refunded"] as const;
export const userRefundRequestableOrderStatuses = ["paid", "activated"] as const;

export function canUserCancelOrder(status: OrderStatus) {
  return userCancellableOrderStatuses.includes(status as (typeof userCancellableOrderStatuses)[number]);
}

export function canAdminDeleteOrderSafely(status: OrderStatus) {
  return status !== "activated" && status !== "paid" && status !== "refunded";
}

export function canRecordRefundForOrder(status: OrderStatus) {
  return refundableOrderStatuses.includes(status as (typeof refundableOrderStatuses)[number]);
}

export function canUserRequestRefundForOrder(status: OrderStatus, hasPendingRefundRequest: boolean, hasUsedBenefits = false) {
  if (hasPendingRefundRequest) return false;
  if (hasUsedBenefits) return false;
  return userRefundRequestableOrderStatuses.includes(status as (typeof userRefundRequestableOrderStatuses)[number]);
}

export function getRefundRecordActorLabel(input: { adminEmail?: string | null; requesterEmail?: string | null }) {
  if (input.adminEmail) return input.adminEmail;
  if (input.requesterEmail) return `用户申请：${input.requesterEmail}`;
  return "系统记录";
}

export function normalizeRefundRecordAmount(value: unknown, maxAmount: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Refund amount must be greater than 0.");
  if (amount > maxAmount) throw new Error("Refund amount cannot exceed order amount.");
  return Math.round(amount * 100) / 100;
}

export function getRefundStatusPatch(status: RefundStatus, currentCompletedAt?: Date | null, now = new Date()) {
  return {
    completedAt: status === "completed" ? currentCompletedAt ?? now : null
  };
}

export function isAdminDeleteRiskConfirmed(value: string | null | undefined) {
  return value === adminDeleteRiskConfirmationToken;
}

export function assertAdminOrderStatusUpdateAllowed(status: OrderStatus, currentStatus?: OrderStatus | null) {
  if (status === "activated" && currentStatus !== "activated") {
    throw new Error("订单不能通过手动改状态开通权益，请使用支付审核通过或手动调整 VIP 功能。");
  }
}
