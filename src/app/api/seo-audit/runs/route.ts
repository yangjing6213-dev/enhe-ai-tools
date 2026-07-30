import { NextResponse } from "next/server";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  enqueueAnonymousFreeAudit,
  type SeoAuditEntitlementErrorCode,
} from "@/lib/seo-audit/entitlements";
import { SEO_AUDIT_ENGINE_VERSION } from "@/lib/seo-audit/artifacts";
import { SEO_AUDIT_PUBLIC_TOKEN_COOKIE } from "@/lib/seo-audit/public-access";
import {
  generateSeoAuditPublicToken,
  parseCreateSeoAuditRunInput,
  readTrustedClientIp,
} from "@/lib/seo-audit/public-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxRequestBytes = 4 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return jsonError("UNSUPPORTED_MEDIA_TYPE", 415);
  }
  if (!isSameOriginRequest(request)) {
    return jsonError("CROSS_SITE_REQUEST", 403);
  }

  let input: ReturnType<typeof parseCreateSeoAuditRunInput>;
  let ipAddress: string;
  try {
    input = parseCreateSeoAuditRunInput(await readBoundedJson(request));
    ipAddress = readTrustedClientIp(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST";
    if (code === "REQUEST_TOO_LARGE") return jsonError(code, 413);
    if (code === "CLIENT_IP_UNAVAILABLE") return jsonError(code, 400);
    return jsonError("INVALID_REQUEST", 400);
  }

  const publicToken = generateSeoAuditPublicToken();
  try {
    const result = await enqueueAnonymousFreeAudit({
      targetUrl: input.targetUrl,
      ipAddress,
      publicToken,
      engineVersion: SEO_AUDIT_ENGINE_VERSION,
    });
    await trackAnalyticsEvent({
      eventName: "seo_audit_submitted",
      path: "/online-tools/seo-geo-audit",
      entityType: "seo_audit_run",
      entityId: result.runId,
      metadata: { cached: result.cached },
    }).catch(() => undefined);

    const response = NextResponse.json(
      {
        ok: true,
        runId: result.runId,
        status: result.cached ? "completed" : "queued",
        cached: result.cached,
        token: publicToken,
      },
      { status: 201, headers: noStoreHeaders },
    );
    response.cookies.set(SEO_AUDIT_PUBLIC_TOKEN_COOKIE, publicToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/seo-audit/runs",
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    const code = readEntitlementErrorCode(error);
    if (code === "INVALID_TARGET") return jsonError(code, 400);
    if (code === "PUBLIC_TOKEN_ACTIVE") return jsonError(code, 409);
    if (code === "IP_DAILY_LIMIT" || code === "ORIGIN_DAILY_LIMIT") {
      return jsonError(code, 429);
    }
    if (code === "QUEUE_CAPACITY_REACHED" || code === "CONFIGURATION_ERROR") {
      return jsonError(code, 503);
    }
    console.error("[seo-audit] failed to enqueue anonymous run");
    return jsonError("AUDIT_CREATE_FAILED", 500);
  }
}

async function readBoundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    throw new Error("REQUEST_TOO_LARGE");
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxRequestBytes) {
    throw new Error("REQUEST_TOO_LARGE");
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("INVALID_REQUEST");
  }
}

function isSameOriginRequest(request: Request) {
  const expectedOrigins = new Set([new URL(request.url).origin]);
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (value) expectedOrigins.add(new URL(value).origin);
    } catch {
      // Ignore malformed optional configuration and keep the request origin bound.
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

function readEntitlementErrorCode(
  error: unknown,
): SeoAuditEntitlementErrorCode | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = String(error.code);
  return [
    "INVALID_TARGET",
    "IP_DAILY_LIMIT",
    "ORIGIN_DAILY_LIMIT",
    "QUEUE_CAPACITY_REACHED",
    "PUBLIC_TOKEN_ACTIVE",
    "CONFIGURATION_ERROR",
  ].includes(code)
    ? (code as SeoAuditEntitlementErrorCode)
    : null;
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
