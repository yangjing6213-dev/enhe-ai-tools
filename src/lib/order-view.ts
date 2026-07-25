import type { OrderType } from "@prisma/client";

export function getOrderBenefitExpiry(input: {
  orderType: OrderType;
  activatedAt: Date | null;
  plan?: { durationDays: number } | null;
}) {
  if (!input.activatedAt) return "未开通";

  switch (input.orderType) {
    case "software_download":
      return "永久授权";
    case "seo_audit_credit":
      return "巡检次数包（非 VIP、非永久授权）";
    case "seo_audit_monitoring":
      return "监控服务期（非 VIP、非永久授权）";
    case "vip":
      break;
    default: {
      const unsupportedOrderType: never = input.orderType;
      throw new Error(`Unsupported order type: ${unsupportedOrderType}`);
    }
  }

  const durationDays = input.plan?.durationDays ?? 0;
  if (durationDays <= 0) return "永久VIP";
  const expiry = new Date(input.activatedAt);
  expiry.setDate(expiry.getDate() + durationDays);
  return expiry.toLocaleString("zh-CN");
}
