import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { assertDownloadAccess } from "@/lib/access";
import { DownloadRateLimitError } from "@/lib/access-rules";
import { getAiWorkflowDownloadUrl } from "@/lib/ai-workflows/cos";
import { getSecureFileDownloadUrl, resolvePrivateLocalUploadPath } from "@/lib/storage";
import { prisma } from "@/lib/db";

const workflowVisitorCookie = "aiw_visitor";

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
  const [tool, savedVisitorKey] = await Promise.all([
    prisma.tool.findUnique({ where: { id }, select: { type: true } }),
    Promise.resolve(readWorkflowVisitorCookie(request)),
  ]);
  const newVisitorKey = tool?.type === "ai_workflow" && !savedVisitorKey ? randomBytes(32).toString("hex") : null;
  const visitorKey = savedVisitorKey ?? newVisitorKey ?? undefined;
  let file;
  try {
    file = await assertDownloadAccess(id, visitorKey);
  } catch (error) {
    if (error instanceof DownloadRateLimitError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
  if (!file) {
    return NextResponse.json({ message: "文件已记录权限，但尚未配置下载地址。" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    if (tool?.type === "ai_workflow") {
      const url = getAiWorkflowDownloadUrl(file);
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: url,
          "Cache-Control": "private, no-store",
          Pragma: "no-cache",
        },
      });
      return attachWorkflowVisitorCookie(response, request, newVisitorKey);
    }
    const privateLocalPath = resolvePrivateLocalUploadPath(file.filePath);
    if (privateLocalPath) {
      const fileStat = await stat(privateLocalPath);
      if (!fileStat.isFile()) throw new Error("Download path is not a file.");
      const body = Readable.toWeb(createReadStream(privateLocalPath)) as ReadableStream;
      const encodedFileName = encodeURIComponent(file.fileName);
      return attachWorkflowVisitorCookie(new Response(body, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
          "Content-Length": String(fileStat.size),
          "Content-Type": file.mimeType || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
      }), request, newVisitorKey);
    }
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: String(await getSecureFileDownloadUrl(file, request.url)),
        "Cache-Control": "private, no-store",
        Pragma: "no-cache",
      },
    });
    return attachWorkflowVisitorCookie(response, request, newVisitorKey);
  } catch (error) {
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
