import type { OrderStatus, OrderType } from "@prisma/client";

const zpayPayableOrderTypes = [
  "software_download",
  "seo_audit_credit",
  "seo_audit_monitoring",
] as const;

type OrderPaymentPresentationInput = {
  orderType: OrderType;
  orderStatus: OrderStatus;
  hasToolPurchase?: boolean;
  hasSeoAuditCredit?: boolean;
  hasSeoAuditSubscriptionOrder?: boolean;
};

export function getOrderPaymentPresentation(input: OrderPaymentPresentationInput) {
  const isTerminalUnpayable = input.orderStatus === "cancelled" || input.orderStatus === "refunded";
  const hasExpectedEntitlement =
    input.orderType === "software_download"
      ? Boolean(input.hasToolPurchase)
      : input.orderType === "seo_audit_credit"
        ? Boolean(input.hasSeoAuditCredit)
        : input.orderType === "seo_audit_monitoring"
          ? Boolean(input.hasSeoAuditSubscriptionOrder)
          : false;
  const isUnlocked = !isTerminalUnpayable && (input.orderStatus === "activated" || hasExpectedEntitlement);

  if (input.orderType === "seo_audit_credit") {
    return {
      isZpayPayable: true,
      isTerminalUnpayable,
      isUnlocked,
      typeLabel: "SEO/GEO 巡检次数包",
      paymentCompletionText: "支付成功后，自动发放对应的 SEO/GEO 巡检次数。",
      unlockedTitle: "巡检次数已发放",
      unlockedDescription: "该订单已完成支付并发放巡检次数，可在订单详情查看权益状态。",
    };
  }
  if (input.orderType === "seo_audit_monitoring") {
    return {
      isZpayPayable: true,
      isTerminalUnpayable,
      isUnlocked,
      typeLabel: "SEO/GEO 持续监控",
      paymentCompletionText: "支付成功后，自动开通或续期 SEO/GEO 持续监控。",
      unlockedTitle: "持续监控已开通",
      unlockedDescription: "该订单已完成支付并绑定监控服务期，可在订单详情查看权益状态。",
    };
  }

  return {
    isZpayPayable: zpayPayableOrderTypes.includes(
      input.orderType as (typeof zpayPayableOrderTypes)[number],
    ),
    isTerminalUnpayable,
    isUnlocked,
    typeLabel: input.orderType === "software_download" ? "软件下载解锁" : "订单",
    paymentCompletionText:
      input.orderType === "software_download"
        ? "支付成功后，自动解锁该软件的下载链接。"
        : "支付成功后，系统会自动处理订单权益。",
    unlockedTitle: input.orderType === "software_download" ? "已解锁下载链接" : "订单权益已开通",
    unlockedDescription:
      input.orderType === "software_download"
        ? "该订单已经完成支付并开通权益。你可以返回工具详情页查看下载链接内容。"
        : "该订单已经完成支付并开通权益。",
  };
}
