import { NextResponse } from "next/server";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { assertValidCsrfToken } from "@/lib/csrf";
import { consumeSeoAuditCreditAndEnqueue } from "@/lib/seo-audit/entitlements";
import { loadOwnedSeoAuditRecheckSource } from "@/lib/seo-audit/public-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isJsonRequest(request)) return jsonError("UNSUPPORTED_MEDIA_TYPE", 415);
  if (!isSameOriginRequest(request)) return jsonError("CROSS_SITE_REQUEST", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("AUTHENTICATION_REQUIRED", 401);
  const { id } = await params;

  let csrfToken: string;
  try {
    const input = await readBoundedObject(request);
    if (
      Object.keys(input).length !== 1 ||
      typeof input.csrfToken !== "string" ||
      input.csrfToken.length < 1 ||
      input.csrfToken.length > 512
    ) {
      throw new Error("INVALID_REQUEST");
    }
    csrfToken = input.csrfToken;
    await assertValidCsrfToken(csrfToken);
  } catch {
    return jsonError("INVALID_REQUEST", 400);
  }

  try {
    const source = await loadOwnedSeoAuditRecheckSource(id, user.id);
    const result = await consumeSeoAuditCreditAndEnqueue({
      userId: user.id,
      creditId: source.creditId,
      kind: source.kind,
      targetUrl: source.targetUrl,
    });
    await trackAnalyticsEvent({
      eventName: "seo_audit_recheck_started",
      path: "/online-tools/seo-geo-audit",
      entityType: "seo_audit_run",
      entityId: result.runId,
      userId: user.id,
      metadata: { sourceRunId: id },
    }).catch(() => undefined);
    return NextResponse.json(
      { ok: true, runId: result.runId, status: "queued" },
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    const code = readErrorCode(error);
    if (code === "SEO_AUDIT_RECHECK_UNAVAILABLE") {
      return jsonError(code, 403);
    }
    if (code === "ENTITLEMENT_UNAVAILABLE") {
      return jsonError(code, 409);
    }
    return jsonError("SEO_AUDIT_RECHECK_FAILED", 500);
  }
}

function isJsonRequest(request: Request) {
  return (request.headers.get("content-type") ?? "")
    .toLowerCase()
    .startsWith("application/json");
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try {
      if (value) allowed.add(new URL(value).origin);
    } catch {
      // Ignore malformed optional configuration.
    }
  }
  return allowed.has(origin);
}

async function readBoundedObject(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 2 * 1024) {
    throw new Error("INVALID_REQUEST");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("INVALID_REQUEST");
  }
  return parsed as Record<string, unknown>;
}

function readErrorCode(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }
  return "";
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
