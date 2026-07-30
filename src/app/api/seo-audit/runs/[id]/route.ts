import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildSeoAuditRunResponse,
  canReadSeoAuditFullReport,
  resolveSeoAuditRunAccess,
  SEO_AUDIT_PUBLIC_TOKEN_COOKIE,
} from "@/lib/seo-audit/public-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return jsonError("INVALID_RUN_ID", 400);
  }

  const [user, run] = await Promise.all([
    getCurrentUser(),
    prisma.seoAuditRun.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        kind: true,
        normalizedOrigin: true,
        pageLimit: true,
        publicTokenHash: true,
        publicTokenExpiresAt: true,
        summaryScore: true,
        summaryEvidenceCoverage: true,
        summaryPageCount: true,
        summaryCriticalCount: true,
        summaryHighCount: true,
        summaryMediumCount: true,
        summaryFindings: true,
        failureCode: true,
        reportJsonKey: true,
        reportMarkdownKey: true,
        reportSha256: true,
        createdAt: true,
        completedAt: true,
        sourceOrder: {
          select: {
            orderStatus: true,
            refundRecords: { select: { status: true } },
          },
        },
      },
    }),
  ]);
  if (!run) return accessDenied();

  const access = resolveSeoAuditRunAccess(run, {
    userId: user?.id,
    token: readPublicToken(request),
  });
  if (!access) return accessDenied();

  return NextResponse.json(
    buildSeoAuditRunResponse(run, {
      access,
      publicFindingLimit: 3,
      canReadFullReport:
        access === "owner" && canReadSeoAuditFullReport(run, user?.id),
    }),
    { headers: noStoreHeaders },
  );
}

function readPublicToken(request: Request) {
  const headerToken = request.headers.get("x-seo-audit-token")?.trim();
  if (headerToken) return headerToken;
  const prefix = `${SEO_AUDIT_PUBLIC_TOKEN_COOKIE}=`;
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function accessDenied() {
  return jsonError("RUN_NOT_FOUND_OR_ACCESS_DENIED", 404);
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
