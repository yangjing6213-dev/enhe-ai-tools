import type { Prisma } from "@prisma/client";

export function getNotificationHistoryWhere(userId: string, newestIds: string[]): Prisma.NotificationWhereInput {
  return {
    userId,
    readAt: { not: null },
    ...(newestIds.length ? { id: { notIn: newestIds } } : {}),
  };
}
