import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("AUTHENTICATION_REQUIRED", 401);

  const subscriptionId = readSubscriptionId(request);
  if (!subscriptionId) return jsonError("INVALID_REQUEST", 400);

  try {
    const subscription = await prisma.seoAuditSubscription.findFirst({
      where: { id: subscriptionId, userId: user.id },
      select: {
        id: true,
        status: true,
        startsAt: true,
        expiresAt: true,
        maxScheduledRuns: true,
        scheduledRunsUsed: true,
        manualRunsRemaining: true,
        project: { select: { normalizedOrigin: true } },
        offer: { select: { pageLimit: true } },
        schedule: {
          select: {
            cadence: true,
            weekday: true,
            hour: true,
            minute: true,
            timeZone: true,
            enabled: true,
            notificationEmail: true,
            nextRunAt: true,
            lastRunAt: true,
          },
        },
      },
    });
    if (!subscription) return jsonError("SUBSCRIPTION_NOT_FOUND", 404);

    return NextResponse.json(
      { ok: true, subscription },
      { headers: noStoreHeaders },
    );
  } catch {
    console.error("[seo-audit] failed to read subscription");
    return jsonError("SUBSCRIPTION_READ_FAILED", 500);
  }
}

function readSubscriptionId(request: Request) {
  const params = new URL(request.url).searchParams;
  const entries = [...params.entries()];
  if (entries.length !== 1 || entries[0][0] !== "subscriptionId") return null;
  const id = entries[0][1];
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null;
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
