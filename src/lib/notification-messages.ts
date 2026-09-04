import { reviewCompletionNotice } from "@/lib/review-copy";

export type NotificationMessage = {
  type: "payment_review" | "refund_request" | "refund_processed" | "vip_adjustment";
  title: string;
  content: string;
  linkUrl: string;
};

export function buildPaymentReviewNotification(input: {
  orderId: string;
  orderNo: string;
  decision: "approved" | "rejected";
  reviewNote?: string | null;
}): NotificationMessage {
  if (input.decision === "approved") {
    return {
      type: "payment_review",
      title: "付款审核已通过",
      content: `订单 ${input.orderNo} 已审核通过，相关权益已完成开通。`,
      linkUrl: `/orders/${input.orderId}`
    };
  }

  return {
    type: "payment_review",
    title: "付款审核未通过",
    content: `订单 ${input.orderNo} 的付款凭证审核未通过。${formatOptionalNote(input.reviewNote)}`,
    linkUrl: `/orders/${input.orderId}`
  };
}

export function buildRefundRequestNotification(input: { orderId: string; orderNo: string }): NotificationMessage {
  return {
    type: "refund_request",
    title: "售后/退款申请已提交",
    content: `订单 ${input.orderNo} 的售后/退款申请已提交，管理员处理后会在这里通知你。${reviewCompletionNotice}`,
    linkUrl: `/orders/${input.orderId}`
  };
}

export function buildRefundProcessedNotification(input: {
  orderId: string;
  orderNo: string;
  status: "completed" | "rejected";
  note?: string | null;
}): NotificationMessage {
  if (input.status === "completed") {
    return {
      type: "refund_processed",
      title: "售后/退款处理完成",
      content: `订单 ${input.orderNo} 的售后/退款申请已处理完成。${formatOptionalNote(input.note, "处理说明")}`,
      linkUrl: `/orders/${input.orderId}`
    };
  }

  return {
    type: "refund_processed",
    title: "售后/退款申请未通过",
    content: `订单 ${input.orderNo} 的售后/退款申请未通过。${formatOptionalNote(input.note, "处理说明")}`,
    linkUrl: `/orders/${input.orderId}`
  };
}

export function buildManualVipNotification(input: {
  actionType: "grant" | "cancel";
  vipType: string;
  reason: string;
}): NotificationMessage {
  if (input.actionType === "cancel") {
    return {
      type: "vip_adjustment",
      title: "VIP 权益已调整",
      content: `管理员已取消你的 VIP 权益。原因：${input.reason}`,
      linkUrl: "/user"
    };
  }

  return {
    type: "vip_adjustment",
    title: "VIP 权益已调整",
    content: `管理员已为你开通/延长 ${input.vipType}。原因：${input.reason}`,
    linkUrl: "/user"
  };
}

function formatOptionalNote(note?: string | null, label = "原因") {
  const trimmed = note?.trim();
  return trimmed ? `${label}：${trimmed}` : "";
}
