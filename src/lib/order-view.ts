export function getOrderBenefitExpiry(input: {
  orderType: "vip" | "software_download";
  activatedAt: Date | null;
  plan?: { durationDays: number } | null;
}) {
  if (!input.activatedAt) return "未开通";
  if (input.orderType === "software_download") return "永久授权";
  const durationDays = input.plan?.durationDays ?? 0;
  if (durationDays <= 0) return "永久VIP";
  const expiry = new Date(input.activatedAt);
  expiry.setDate(expiry.getDate() + durationDays);
  return expiry.toLocaleString("zh-CN");
}
