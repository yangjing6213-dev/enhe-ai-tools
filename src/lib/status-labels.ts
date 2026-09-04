import type { Locale } from "@/lib/i18n";

export const orderStatusLabels: Record<string, string> = {
  pending_payment: "Pending payment",
  pending_review: "Pending review",
  paid: "Paid",
  activated: "Activated",
  rejected: "Rejected",
  cancelled: "Cancelled",
  refunded: "Refunded"
};

export const proofStatusLabels: Record<string, string> = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected"
};

export const refundStatusLabels: Record<string, string> = {
  pending: "Pending",
  completed: "Refunded",
  rejected: "Rejected"
};

const zhStatusLabels = {
  order: {
    pending_payment: "待支付",
    pending_review: "待审核",
    paid: "已支付",
    activated: "已开通",
    rejected: "审核失败",
    cancelled: "已取消",
    refunded: "已退款"
  },
  proof: {
    not_submitted: "未提交",
    pending: "待审核",
    approved: "审核通过",
    rejected: "审核驳回"
  },
  refund: {
    pending: "待处理",
    completed: "已退款",
    rejected: "已驳回"
  }
} as const;

const enStatusLabels = {
  order: orderStatusLabels,
  proof: proofStatusLabels,
  refund: refundStatusLabels
} as const;

export type StatusLabelKind = keyof typeof enStatusLabels;

export function getLocalizedStatusLabel(kind: StatusLabelKind, status?: string | null, locale: Locale = "en") {
  if (!status) return locale === "zh" ? "未提交" : "Not submitted";
  const labels = locale === "zh" ? zhStatusLabels[kind] : enStatusLabels[kind];
  return labels[status as keyof typeof labels] ?? status;
}

export function getStatusLabel(map: Record<string, string>, status?: string | null, locale: Locale = "en") {
  if (!status) return locale === "zh" ? "未提交" : "Not submitted";

  if (locale === "zh") {
    if (map === orderStatusLabels) return getLocalizedStatusLabel("order", status, locale);
    if (map === proofStatusLabels) return getLocalizedStatusLabel("proof", status, locale);
    if (map === refundStatusLabels) return getLocalizedStatusLabel("refund", status, locale);
  }

  return map[status] ?? status;
}
