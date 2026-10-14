import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReadForumAttachment, isForumAttachmentPublic, isForumMediaSameOriginRequest, parseForumMediaRange } from "@/lib/forum-media";
import { deleteForumMediaStoredFile } from "@/lib/forum-media-storage";
import { getSecureCosMediaUrl, parseCosFilePath, resolvePrivateLocalUploadPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
const deniedHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return unavailable();
  try {
    const item = await prisma.forumAttachment.findUnique({ where: { id }, include: { post: { select: { status: true } }, reply: { select: { status: true, post: { select: { status: true } } } } } });
    if (!item || item.discardedAt) return unavailable();
    const isPublic = isForumAttachmentPublic(item);
    const user = isPublic ? null : await getCurrentUser();
    if (!canReadForumAttachment(item, user)) return unavailable();
    if (!((item.kind === "image" && item.mimeType === "image/webp") || (item.kind === "video" && ["video/mp4", "video/webm"].includes(item.mimeType)))) return unavailable();
    const headers: Record<string, string> = { "Cache-Control": isPublic ? "public, max-age=0, must-revalidate" : "private, no-store", "Vary": "Cookie", "Content-Type": item.mimeType, "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes", "Content-Disposition": "inline" };
    const cos = parseCosFilePath(item.filePath);
    const local = cos ? null : resolvePrivateLocalUploadPath(item.filePath);
    if (cos && (!cos.key.startsWith("forum-media/") || cos.key.split("/").some((part) => part === "." || part === ".." || part.includes("\\")))) return unavailable();
    if (!cos && !local) return unavailable();
    const size = local ? (await stat(local)).size : item.fileSize;
    const range = parseForumMediaRange(request.headers.get("range"), size);
    if (range === "invalid") return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    let body: ReadableStream<Uint8Array> | null;
    let status = range ? 206 : 200;
    if (local) {
      body = Readable.toWeb(createReadStream(local, range ?? undefined)) as ReadableStream<Uint8Array>;
    } else {
      const signed = await getSecureCosMediaUrl(item.filePath);
      if (!signed) return unavailable();
      const upstream = await fetch(signed, { headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {}, redirect: "error", cache: "no-store", signal: request.signal });
      if (!upstream.ok || !upstream.body || ![200, 206].includes(upstream.status)) { await upstream.body?.cancel(); return unavailable(); }
      body = upstream.body;
      status = upstream.status;
    }
    if (range && status === 206) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
      headers["Content-Length"] = String(range.end - range.start + 1);
    } else {
      headers["Content-Length"] = String(size);
    }
    return new Response(body, { status, headers });
  } catch {
    return unavailable();
  }
}

function unavailable() {
  return NextResponse.json({ code: "FORUM_MEDIA_NOT_AVAILABLE" }, { status: 404, headers: deniedHeaders });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: "FORUM_MEDIA_LOGIN" }, { status: 401, headers: deniedHeaders });
  if (!isForumMediaSameOriginRequest(request)) return NextResponse.json({ code: "FORUM_MEDIA_ORIGIN" }, { status: 403, headers: deniedHeaders });
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return unavailable();
  try {
    const item = await prisma.forumAttachment.findUnique({ where: { id } });
    if (!item || item.authorId !== user.id) return unavailable();
    if (item.postId || item.replyId) return NextResponse.json({ code: "FORUM_MEDIA_ALREADY_ATTACHED" }, { status: 409, headers: deniedHeaders });
    const where = { id, authorId: user.id, postId: null, replyId: null };
    const discardedAt = new Date();
    const marked = await prisma.forumAttachment.updateMany({ where, data: { discardedAt } });
    if (marked.count !== 1) return NextResponse.json({ code: "FORUM_MEDIA_ALREADY_ATTACHED" }, { status: 409, headers: deniedHeaders });
    if (!(await deleteForumMediaStoredFile(item.filePath))) return NextResponse.json({ code: "FORUM_MEDIA_UNAVAILABLE" }, { status: 503, headers: deniedHeaders });
    const removed = await prisma.forumAttachment.deleteMany({ where: { ...where, discardedAt } });
    if (removed.count !== 1) return NextResponse.json({ code: "FORUM_MEDIA_ALREADY_ATTACHED" }, { status: 409, headers: deniedHeaders });
    return NextResponse.json({ deleted: true }, { headers: deniedHeaders });
  } catch {
    return NextResponse.json({ code: "FORUM_MEDIA_UNAVAILABLE" }, { status: 500, headers: deniedHeaders });
  }
}
