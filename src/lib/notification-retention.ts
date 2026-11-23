import type { PrismaClient } from "@prisma/client";

export function getNotificationRetentionCutoffs(now = new Date()) {
  return {
    memberBefore: subtractCalendarMonths(now, 3),
    adminBefore: subtractCalendarMonths(now, 12),
  };
}

function subtractCalendarMonths(value: Date, months: number) {
  const result = new Date(value);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDayInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayInTargetMonth));
  return result;
}

export async function deleteExpiredNotifications(
  client: { notification: Pick<PrismaClient["notification"], "deleteMany"> },
  now = new Date(),
) {
  const cutoffs = getNotificationRetentionCutoffs(now);
  const [members, admins] = await Promise.all([
    client.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffs.memberBefore },
        user: { is: { role: { not: "admin" } } },
      },
    }),
    client.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffs.adminBefore },
        user: { is: { role: "admin" } },
      },
    }),
  ]);

  return { membersDeleted: members.count, adminsDeleted: admins.count };
}
