import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildSeoAuditFullReportResponse,
  loadOwnedSeoAuditRecheckSource,
  loadOwnedSeoAuditReportRun,
  readSeoAuditPrivateArtifact,
} from "@/lib/seo-audit/public-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("AUTHENTICATION_REQUIRED", 401);
  const { id } = await params;

  try {
    const run = await loadOwnedSeoAuditReportRun(id, user.id);
    const [rawReport, canRecheck] = await Promise.all([
      readSeoAuditPrivateArtifact({
        runId: run.id,
        reportSha256: run.reportSha256 as string,
        reportJsonKey: run.reportJsonKey as string,
        reportMarkdownKey: run.reportMarkdownKey as string,
        format: "json",
      }),
      loadOwnedSeoAuditRecheckSource(id, user.id).then(
        () => true,
        () => false,
      ),
    ]);
    let report: unknown;
    try {
      report = JSON.parse(rawReport) as unknown;
    } catch {
      throw new Error("REPORT_INVALID");
    }
    return NextResponse.json(
      buildSeoAuditFullReportResponse(run, report, { canRecheck }),
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return reportError(error);
  }
}

function reportError(error: unknown) {
  const code = error instanceof Error ? error.message : "REPORT_UNAVAILABLE";
  if (code === "REPORT_NOT_FOUND") return jsonError(code, 404);
  if (code === "REPORT_ACCESS_DENIED") return jsonError(code, 403);
  return jsonError("REPORT_UNAVAILABLE", 502);
}

function jsonError(code: string, status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: noStoreHeaders },
  );
}
