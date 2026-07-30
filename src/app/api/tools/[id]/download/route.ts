import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { assertDownloadAccess } from "@/lib/access";
import { DownloadRateLimitError } from "@/lib/access-rules";
import { getSecureFileDownloadUrl, resolvePrivateLocalUploadPath } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let file;
  try {
    file = await assertDownloadAccess(id);
  } catch (error) {
    if (error instanceof DownloadRateLimitError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
  if (!file) {
    return NextResponse.json({ message: "文件已记录权限，但尚未配置下载地址。" }, { status: 404 });
  }
  try {
    const privateLocalPath = resolvePrivateLocalUploadPath(file.filePath);
    if (privateLocalPath) {
      const fileStat = await stat(privateLocalPath);
      if (!fileStat.isFile()) throw new Error("Download path is not a file.");
      const body = Readable.toWeb(createReadStream(privateLocalPath)) as ReadableStream;
      const encodedFileName = encodeURIComponent(file.fileName);
      return new Response(body, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodedFileName}`,
          "Content-Length": String(fileStat.size),
          "Content-Type": file.mimeType || "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return NextResponse.redirect(await getSecureFileDownloadUrl(file, request.url));
  } catch {
    return NextResponse.json({ message: "文件已记录权限，但尚未配置下载地址。" }, { status: 404 });
  }
}
