import type { Prisma, PrismaClient } from "@prisma/client";
import type { NotificationMessage } from "@/lib/notification-messages";
import { prisma } from "@/lib/db";

type NotificationClient = Pick<PrismaClient, "notification"> | Prisma.TransactionClient;

export async function createUserNotification(
  userId: string,
  message: NotificationMessage,
  client: NotificationClient = prisma
) {
  return client.notification.create({
    data: {
      userId,
      type: message.type,
      title: message.title,
      content: message.content,
      linkUrl: message.linkUrl
    }
  });
}
