import { getCurrentUser } from "@/lib/auth";
import { trackAnalyticsEvent } from "@/lib/analytics";
import {
  loadOwnedSeoAuditReportRun,
  readSeoAuditPrivateArtifact,
} from "@/lib/seo-audit/public-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "json" && format !== "markdown") {
    return jsonError("INVALID_REPORT_FORMAT", 400);
  }
  const user = await getCurrentUser();
  if (!user) return jsonError("AUTHENTICATION_REQUIRED", 401);
  const { id } = await params;

  try {
    const run = await loadOwnedSeoAuditReportRun(id, user.id);
    const body = await readSeoAuditPrivateArtifact({
      runId: run.id,
      reportSha256: run.reportSha256 as string,
      reportJsonKey: run.reportJsonKey as string,
      reportMarkdownKey: run.reportMarkdownKey as string,
      format,
    });
    await trackAnalyticsEvent({
      eventName: "seo_audit_report_downloaded",
      path: "/online-tools/seo-geo-audit",
      entityType: "seo_audit_run",
      entityId: run.id,
      userId: user.id,
      metadata: { format },
    }).catch(() => undefined);
    const extension = format === "json" ? "json" : "md";
    return new Response(body, {
      headers: {
        ...privateHeaders,
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="seo-geo-audit-${run.id}.${extension}"`,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REPORT_UNAVAILABLE";
    if (code === "REPORT_NOT_FOUND") return jsonError(code, 404);
    if (code === "REPORT_ACCESS_DENIED") return jsonError(code, 403);
    return jsonError("REPORT_UNAVAILABLE", 502);
  }
}

function jsonError(code: string, status: number) {
  return Response.json(
    { ok: false, code },
    { status, headers: privateHeaders },
  );
}
