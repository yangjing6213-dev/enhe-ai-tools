import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNotificationDisplay } from "@/lib/notification-display";
import type { Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { hasUnread: false, orders: [], notifications: [] },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const locale: Locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "zh";
  const [orders, notifications, unreadCount] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        orderStatus: true,
        orderType: true,
        createdAt: true,
        plan: { select: { name: true } },
        tool: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        linkUrl: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return NextResponse.json(
    {
      hasUnread: unreadCount > 0,
      orders: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        itemName: order.tool?.name ?? order.plan?.name ?? (
          locale === "en"
            ? order.orderType === "vip" ? "Membership order" : "SEO/GEO service order"
            : order.orderType === "vip" ? "会员订单" : "SEO/GEO 服务订单"
        ),
        amount: order.amount.toString(),
        orderStatus: order.orderStatus,
        createdAt: order.createdAt.toISOString(),
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        ...getNotificationDisplay(notification, locale),
        linkUrl: notification.linkUrl,
        isRead: notification.readAt !== null,
        createdAt: notification.createdAt.toISOString(),
      })),
    },
    { headers: noStoreHeaders },
  );
}
