import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateOwnedSeoAuditSchedule } from "@/lib/seo-audit/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const maxRequestBytes = 4 * 1024;
const updateSchema = z
  .object({
    subscriptionId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    cadence: z.enum(["weekly", "biweekly", "monthly"]),
    weekday: z.number().int().min(0).max(6),
    hour: z.number().int().min(0).max(23),
    enabled: z.boolean(),
    notificationEmail: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      z.string().trim().email().max(320).nullable(),
    ),
  })
  .strict();

export async function PATCH(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError("UNSUPPORTED_MEDIA_TYPE", 415);
  }
  if (!isSameOriginRequest(request)) {
    return jsonError("CROSS_SITE_REQUEST", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("AUTHENTICATION_REQUIRED", 401);

  const parsed = updateSchema.safeParse(await readBoundedJson(request));
  if (!parsed.success) return jsonError("INVALID_REQUEST", 400);

  try {
    const result = await updateOwnedSeoAuditSchedule({
      userId: user.id,
      subscriptionId: parsed.data.subscriptionId,
      schedule: {
        cadence: parsed.data.cadence,
        weekday: parsed.data.weekday,
        hour: parsed.data.hour,
        minute: 0,
        enabled: parsed.data.enabled,
        notificationEmail: parsed.data.notificationEmail,
      },
    });
    return NextResponse.json(
      { ok: true, scheduleId: result.scheduleId },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : null;
    if (code === "INVALID_SCHEDULE") return jsonError("INVALID_REQUEST", 400);
    if (code === "SCHEDULE_UNAVAILABLE") {
      return jsonError("SCHEDULE_NOT_FOUND_OR_UNAVAILABLE", 404);
    }
    console.error("[seo-audit] failed to update subscription schedule");
    return jsonError("SCHEDULE_UPDATE_FAILED", 500);
  }
}

async function readBoundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return null;
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxRequestBytes) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isSameOriginRequest(request: Request) {
  const expectedOrigins = new Set([new URL(request.url).origin]);
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (value) expectedOrigins.add(new URL(value).origin);
    } catch {
      // Keep authorization bound to valid configured origins.
    }
  }
  const origin = request.headers.get("origin")?.trim();
  if (origin) return expectedOrigins.has(origin);
  const referer = request.headers.get("referer")?.trim();
  if (!referer) return false;
  try {
    return expectedOrigins.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
