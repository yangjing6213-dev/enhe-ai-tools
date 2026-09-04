import { NextResponse } from "next/server";
import { assertDownloadAccess } from "@/lib/access";
import { DownloadRateLimitError } from "@/lib/access-rules";
import { getSecureFileDownloadUrl } from "@/lib/storage";

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
    return NextResponse.redirect(await getSecureFileDownloadUrl(file, request.url));
  } catch {
    return NextResponse.json({ message: "文件已记录权限，但尚未配置下载地址。" }, { status: 404 });
  }
}
