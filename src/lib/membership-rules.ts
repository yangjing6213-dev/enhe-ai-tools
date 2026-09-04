export type MembershipSnapshot = {
  id?: string;
  vipType: string;
  startTime: Date;
  endTime: Date | null;
  isLifetime: boolean;
  status: "active" | "expired" | "cancelled";
};

export function applyVipGrant(
  current: MembershipSnapshot | null,
  plan: { name: string; durationDays: number },
  now = new Date()
) {
  if (plan.durationDays <= 0) {
    return {
      vipType: plan.name,
      startTime: current?.startTime ?? now,
      endTime: null,
      isLifetime: true,
      status: "active" as const
    };
  }

  const base =
    current && current.status === "active" && !current.isLifetime && current.endTime && current.endTime > now
      ? current.endTime
      : now;
  const endTime = new Date(base);
  endTime.setDate(endTime.getDate() + plan.durationDays);

  return {
    vipType: plan.name,
    startTime: current?.startTime ?? now,
    endTime,
    isLifetime: false,
    status: "active" as const
  };
}

export function applyVipCancellation(current: MembershipSnapshot | null, now = new Date()) {
  if (!current) return null;
  return {
    ...current,
    endTime: current.endTime && current.endTime < now ? current.endTime : now,
    isLifetime: false,
    status: "cancelled" as const
  };
}
