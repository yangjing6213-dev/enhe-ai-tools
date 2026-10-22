import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { after, NextResponse } from "next/server";
import { assertDownloadAccess } from "@/lib/access";
import { DownloadRateLimitError } from "@/lib/access-rules";
import { getAiWorkflowDownloadUrl } from "@/lib/ai-workflows/cos";
import { getSecureFileDownloadUrl, resolvePrivateLocalUploadPath } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { parseAnalyticsAttributionCookieValue, serializeAnalyticsAttributionCookie } from "@/lib/analytics-client-payload";

const workflowVisitorCookie = "aiw_visitor";

type DownloadAnalyticsEvent = "product_download_requested" | "product_download_access_granted" | "product_download_response_prepared" | "product_download_request_failed";
type DownloadResponseKind = "private_stream" | "signed_redirect";
type DownloadAnalyticsMetadata = {
  stage: "request" | "access" | "response";
  responseKind?: DownloadResponseKind;
  reason?: "tool_lookup_failed" | "access_not_granted" | "rate_limited" | "file_unavailable" | "response_preparation_failed";
};

function createDownloadEventRecorder(request: Request, confirmedTool: { id?: string }): (eventName: DownloadAnalyticsEvent, metadata: DownloadAnalyticsMetadata) => void {
  let attribution: ReturnType<typeof parseAnalyticsAttributionCookieValue> = null;
  try {
    const prefix = "enhe_analytics_attribution=";
    const cookieValue = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
    const parsed = parseAnalyticsAttributionCookieValue(cookieValue);
    // Keep only the existing compact landing whitelist, never raw cookies or referrer/query text.
    attribution = parsed ? parseAnalyticsAttributionCookieValue(serializeAnalyticsAttributionCookie(parsed)) : null;
  } catch {
    // Invalid or unavailable attribution stays unknown.
  }
  const capturedAttribution = attribution;
  const events: Array<Parameters<typeof trackAnalyticsEvent>[0]> = [];
  try {
    after(async () => {
      for (const event of events) {
        try {
          await trackAnalyticsEvent({ ...event, ...(confirmedTool.id ? { entityId: confirmedTool.id } : {}) });
        } catch {
          // Each event is best effort; a rejection must not skip the remaining observations.
        }
      }
    });
  } catch {
    // Unsupported scheduling must not change the original download response/control flow.
    return () => {};
  }
  return (eventName: DownloadAnalyticsEvent, metadata: DownloadAnalyticsMetadata) => {
    events.push({
      eventName,
      path: "/api/tools/[id]/download",
      entityType: "tool",
      metadata: { ...metadata, observedAt: new Date().toISOString(), ...(capturedAttribution ? { attribution: capturedAttribution } : {}) },
      networkContext: { ip: null, userAgent: null },
    });
  };
}

function readWorkflowVisitorCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${workflowVisitorCookie}=`))?.slice(workflowVisitorCookie.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function attachWorkflowVisitorCookie(response: Response, request: Request, value: string | null) {
  if (!value) return response;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `${workflowVisitorCookie}=${value}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const confirmedTool: { id?: string } = {};
  const recordDownloadEvent = createDownloadEventRecorder(request, confirmedTool);
  recordDownloadEvent("product_download_requested", { stage: "request" });
  const [tool, savedVisitorKey] = await Promise.all([
    prisma.tool.findUnique({ where: { id }, select: { type: true } }),
    Promise.resolve(readWorkflowVisitorCookie(request)),
  ]).catch(error => {
    recordDownloadEvent("product_download_request_failed", { stage: "request", reason: "tool_lookup_failed" });
    throw error;
  });
  if (tool) confirmedTool.id = id;
  const newVisitorKey = tool?.type === "ai_workflow" && !savedVisitorKey ? randomBytes(32).toString("hex") : null;
  const visitorKey = savedVisitorKey ?? newVisitorKey ?? undefined;
  let file;
  try {
    file = await assertDownloadAccess(id, visitorKey);
  } catch (error) {
    recordDownloadEvent("product_download_request_failed", { stage: "access", reason: error instanceof DownloadRateLimitError ? "rate_limited" : "access_not_granted" });
    if (error instanceof DownloadRateLimitError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
  if (!file) {
    recordDownloadEvent("product_download_request_failed", { stage: "access", reason: "file_unavailable" });
    return NextResponse.json({ message: "文件已记录权限，但尚未配置下载地址。" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  recordDownloadEvent("product_download_access_granted", { stage: "access" });
  let responseKind: DownloadResponseKind | undefined;
  try {
    if (tool?.type === "ai_workflow") {
      responseKind = "signed_redirect";
      const url = getAiWorkflowDownloadUrl(file);
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: url,
          "Cache-Control": "private, no-store",
          Pragma: "no-cache",
        },
      });
      const prepared = attachWorkflowVisitorCookie(response, request, newVisitorKey);
      recordDownloadEvent("product_download_response_prepared", { stage: "response", responseKind });
      return prepared;
    }
    const privateLocalPath = resolvePrivateLocalUploadPath(file.filePath);
    if (privateLocalPath) {
      responseKind = "private_stream";
      const fileStat = await stat(privateLocalPath);
      if (!fileStat.isFile()) throw new Error("Download path is not a file.");
      const body = Readable.toWeb(createReadStream(privateLocalPath)) as ReadableStream;
      const encodedFileName = encodeURIComponent(file.fileName);
      const prepared = attachWorkflowVisitorCookie(new Response(body, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
          "Content-Length": String(fileStat.size),
          "Content-Type": file.mimeType || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
      }), request, newVisitorKey);
      recordDownloadEvent("product_download_response_prepared", { stage: "response", responseKind });
      return prepared;
    }
    responseKind = "signed_redirect";
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: String(await getSecureFileDownloadUrl(file, request.url)),
        "Cache-Control": "private, no-store",
        Pragma: "no-cache",
      },
    });
    const prepared = attachWorkflowVisitorCookie(response, request, newVisitorKey);
    recordDownloadEvent("product_download_response_prepared", { stage: "response", responseKind });
    return prepared;
  } catch (error) {
    recordDownloadEvent("product_download_request_failed", { stage: "response", reason: "response_preparation_failed", ...(responseKind ? { responseKind } : {}) });
    console.error("Download redirect could not be prepared.", {
      type: tool?.type === "ai_workflow" ? "ai_workflow" : "existing_tool",
      errorType: error instanceof Error ? error.name.slice(0, 60) : "unknown",
    });
    return NextResponse.json(
      { message: tool?.type === "ai_workflow" ? "工作流下载服务暂未就绪，请稍后再试。" : "文件已记录权限，但尚未配置下载地址。" },
      { status: tool?.type === "ai_workflow" ? 503 : 404, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
