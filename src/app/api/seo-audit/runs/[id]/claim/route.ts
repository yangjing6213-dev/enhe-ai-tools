import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SEO_AUDIT_PUBLIC_TOKEN_COOKIE } from "@/lib/seo-audit/public-access";
import { claimAnonymousSeoAuditRun } from "@/lib/seo-audit/public-api";

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

  let token: string;
  try {
    const input = await readBoundedObject(request);
    if (
      Object.keys(input).length !== 1 ||
      typeof input.token !== "string" ||
      !/^[^\s]{24,512}$/.test(input.token)
    ) {
      throw new Error("INVALID_REQUEST");
    }
    token = input.token;
  } catch {
    return jsonError("INVALID_REQUEST", 400);
  }

  try {
    const result = await claimAnonymousSeoAuditRun({
      runId: id,
      userId: user.id,
      publicToken: token,
    });
    const response = NextResponse.json(
      { ok: true, runId: result.runId, claimed: true },
      { headers: noStoreHeaders },
    );
    response.cookies.set(SEO_AUDIT_PUBLIC_TOKEN_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/seo-audit/runs",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SEO_AUDIT_CLAIM_UNAVAILABLE"
    ) {
      return jsonError(error.message, 409);
    }
    return jsonError("SEO_AUDIT_CLAIM_FAILED", 500);
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

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
