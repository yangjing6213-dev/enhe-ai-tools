import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { hasUnread: false },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return NextResponse.json(
    { hasUnread: unreadCount > 0 },
    { headers: noStoreHeaders },
  );
}
