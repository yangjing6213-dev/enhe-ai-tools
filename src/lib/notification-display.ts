import type { Locale } from "@/lib/i18n";
import { reviewCompletionNoticeEn } from "@/lib/review-copy";

type NotificationLike = {
  type: string;
  title: string;
  content: string;
};

export function getNotificationDisplay(notification: NotificationLike, locale: Locale) {
  if (locale === "zh") {
    return {
      title: notification.title,
      content: notification.content
    };
  }

  const orderNo = extractOrderNo(notification.content) ?? extractOrderNo(notification.title) ?? "this order";
  const note = extractTrailingNote(notification.content);

  if (notification.type === "payment_review") {
    if (notification.title.includes("未通过") || notification.content.includes("未通过")) {
      return {
        title: "Payment review rejected",
        content: `Order ${orderNo}'s payment proof was rejected.${note ? ` Reason: ${note}` : ""}`
      };
    }

    return {
      title: "Payment review approved",
      content: `Order ${orderNo} has been approved and the related benefits are now active.`
    };
  }

  if (notification.type === "refund_request") {
    return {
      title: "After-sales/refund request submitted",
      content: `Order ${orderNo}'s after-sales/refund request has been submitted. The admin result will appear here. ${reviewCompletionNoticeEn}`
    };
  }

  if (notification.type === "refund_processed") {
    if (notification.title.includes("未通过") || notification.content.includes("未通过")) {
      return {
        title: "After-sales/refund request rejected",
        content: `Order ${orderNo}'s after-sales/refund request was rejected.${note ? ` Note: ${note}` : ""}`
      };
    }

    return {
      title: "After-sales/refund completed",
      content: `Order ${orderNo}'s after-sales/refund request has been completed.${note ? ` Note: ${note}` : ""}`
    };
  }

  if (notification.type === "vip_adjustment") {
    const isCancel = notification.content.includes("取消");
    const reason = extractTrailingNote(notification.content, "原因");
    return {
      title: "VIP benefits adjusted",
      content: isCancel
        ? `Your VIP benefits were cancelled by an admin.${reason ? ` Reason: ${reason}` : ""}`
        : `Your VIP benefits were granted or extended by an admin.${reason ? ` Reason: ${reason}` : ""}`
    };
  }

  return {
    title: notification.title,
    content: notification.content
  };
}

function extractOrderNo(value: string) {
  return value.match(/ENHE\d+/)?.[0] ?? null;
}

function extractTrailingNote(value: string, labelPattern = "原因|处理说明") {
  const match = value.match(new RegExp(`(?:${labelPattern})[:：]\\s*(.+)$`));
  return match?.[1]?.trim() || "";
}
