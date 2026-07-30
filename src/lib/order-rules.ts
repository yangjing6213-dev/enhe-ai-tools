import type { OrderStatus, OrderType, PaymentRefundState, Prisma, RefundStatus } from "@prisma/client";

export const userCancellableOrderStatuses = ["pending_payment", "pending_review", "rejected"] as const;
export const refundableOrderStatuses = ["paid", "activated"] as const;
export const userRefundRequestableOrderStatuses = ["paid", "activated"] as const;

export function canUserCancelOrder(status: OrderStatus) {
  return userCancellableOrderStatuses.includes(status as (typeof userCancellableOrderStatuses)[number]);
}

export function canRecordRefundForOrder(status: OrderStatus) {
  return refundableOrderStatuses.includes(status as (typeof refundableOrderStatuses)[number]);
}

export function canUserRequestRefundForOrder(status: OrderStatus, hasExistingRefundAttempt: boolean, hasUsedBenefits = false) {
  if (hasExistingRefundAttempt) return false;
  if (hasUsedBenefits) return false;
  return userRefundRequestableOrderStatuses.includes(status as (typeof userRefundRequestableOrderStatuses)[number]);
}

export function hasExistingRefundAttempt(input: {
  refundRecordCount: number;
  paymentRefundRecordId?: string | null;
  paymentRefundState?: PaymentRefundState | null;
}) {
  return input.refundRecordCount > 0
    || Boolean(input.paymentRefundRecordId)
    || Boolean(input.paymentRefundState);
}

type RefundBenefitUsageScopes = {
  isVerifiable: boolean;
  downloadLog: Prisma.DownloadLogWhereInput | null;
  toolUsageLog: Prisma.ToolUsageLogWhereInput | null;
  seoAuditRun: Prisma.SeoAuditRunWhereInput | null;
};

export function getRefundBenefitUsageScopes(input: {
  orderType: OrderType;
  orderId: string;
  userId: string;
  toolId?: string | null;
  benefitStart: Date;
}): RefundBenefitUsageScopes {
  if (input.orderType === "vip") {
    return {
      isVerifiable: true,
      downloadLog: { userId: input.userId, createdAt: { gte: input.benefitStart } },
      toolUsageLog: { userId: input.userId, createdAt: { gte: input.benefitStart } },
      seoAuditRun: null
    };
  }

  if (input.orderType === "software_download" && input.toolId) {
    return {
      isVerifiable: true,
      downloadLog: { userId: input.userId, toolId: input.toolId, createdAt: { gte: input.benefitStart } },
      toolUsageLog: { userId: input.userId, toolId: input.toolId, createdAt: { gte: input.benefitStart } },
      seoAuditRun: null
    };
  }

  if (input.orderType === "seo_audit_credit" || input.orderType === "seo_audit_monitoring") {
    return {
      isVerifiable: true,
      downloadLog: null,
      toolUsageLog: null,
      seoAuditRun: { sourceOrderId: input.orderId }
    };
  }

  return {
    isVerifiable: input.orderType !== "software_download",
    downloadLog: null,
    toolUsageLog: null,
    seoAuditRun: null
  };
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
  const amountInCents = Math.round(amount * 100);
  const orderAmountInCents = Math.round(maxAmount * 100);
  if (amountInCents !== orderAmountInCents) throw new Error("Refund amount must equal order amount.");
  return amountInCents / 100;
}

export function getRefundStatusPatch(status: RefundStatus, currentCompletedAt?: Date | null, now = new Date()) {
  return {
    completedAt: status === "completed" ? currentCompletedAt ?? now : null
  };
}

export function assertAdminOrderStatusUpdateAllowed(status: OrderStatus, currentStatus?: OrderStatus | null) {
  if (status === "activated" && currentStatus !== "activated") {
    throw new Error("订单不能通过手动改状态开通权益，请使用支付审核通过或手动调整 VIP 功能。");
  }
  if (status === "refunded" && currentStatus !== "refunded") {
    throw new Error("Refunded status must be set by the refund workflow.");
  }
}

export function assertAdminOrderFinancialUpdateAllowed(input: {
  hasPaymentTransaction: boolean;
  currentAmount: number;
  nextAmount: number;
}) {
  if (
    input.hasPaymentTransaction &&
    Math.round(input.currentAmount * 100) !== Math.round(input.nextAmount * 100)
  ) {
    throw new Error("Order amount cannot change after payment creation.");
  }
}
