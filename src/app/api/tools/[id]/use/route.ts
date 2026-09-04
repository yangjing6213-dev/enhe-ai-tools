import { NextResponse } from "next/server";
import { assertOnlineToolAccess } from "@/lib/access";
import { resolveRedirectUrl } from "@/lib/redirect-url";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await assertOnlineToolAccess(id);
  if (!tool.onlineUrl) {
    return NextResponse.json({ message: "服务尚未配置访问地址。" }, { status: 404 });
  }
  return NextResponse.redirect(resolveRedirectUrl(tool.onlineUrl, request.url));
}
