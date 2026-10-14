import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { forumAttachmentLifetimeMs, forumImageMaxBytes, forumMediaPendingMax, forumMediaUploadMax, forumMediaUploadWindowMs, forumVideoMaxBytes, getForumMediaUrl, isForumMediaSameOriginRequest, prepareForumMediaUpload } from "@/lib/forum-media";
import { deleteForumMediaStoredFile } from "@/lib/forum-media-storage";
import { saveUploadedFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const attempts = new Map<string, number[]>();
const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("FORUM_MEDIA_LOGIN", 401);
  if (!isForumMediaSameOriginRequest(request)) return jsonError("FORUM_MEDIA_ORIGIN", 403);
  const now = Date.now();
  const recent = (attempts.get(user.id) ?? []).filter((time) => time > now - forumMediaUploadWindowMs);
  if (recent.length >= forumMediaUploadMax) return jsonError("FORUM_MEDIA_LIMIT", 429);
  if (attempts.size >= 1000) {
    for (const [key, times] of attempts) if (!times.some((time) => time > now - forumMediaUploadWindowMs)) attempts.delete(key);
    if (attempts.size >= 1000) return jsonError("FORUM_MEDIA_LIMIT", 429);
  }
  attempts.set(user.id, [...recent, now]);
  const length = Number(request.headers.get("content-length"));
  if (length > forumVideoMaxBytes + 1024 * 1024) return jsonError("FORUM_MEDIA_SIZE", 413);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return jsonError("FORUM_MEDIA_TYPE", 415);
  let storedPath: string | null = null;
  try {
    const expiredBefore = new Date(now - forumAttachmentLifetimeMs);
    const expired = await prisma.forumAttachment.findMany({
      where: { authorId: user.id, postId: null, replyId: null, createdAt: { lt: expiredBefore } },
      select: { id: true, filePath: true },
      orderBy: { createdAt: "asc" },
      take: forumMediaPendingMax,
    });
    for (const draft of expired) {
      try {
        const discardedAt = new Date(now);
        const where = { id: draft.id, authorId: user.id, postId: null, replyId: null, createdAt: { lt: expiredBefore } };
        const marked = await prisma.forumAttachment.updateMany({ where, data: { discardedAt } });
        if (marked.count !== 1) continue;
        if (await deleteForumMediaStoredFile(draft.filePath)) {
          await prisma.forumAttachment.deleteMany({ where: { ...where, discardedAt } });
        }
      } catch {
        // Keep failed cleanup records in the quota and retry on the next upload.
      }
    }
    const [uploads, unused] = await Promise.all([
      prisma.forumAttachment.count({ where: { authorId: user.id, createdAt: { gte: new Date(now - forumMediaUploadWindowMs) } } }),
      prisma.forumAttachment.count({ where: { authorId: user.id, postId: null, replyId: null } }),
    ]);
    if (uploads >= forumMediaUploadMax || unused >= forumMediaPendingMax) return jsonError("FORUM_MEDIA_LIMIT", 429);
    const formData = await readBoundedFormData(request);
    const input = formData.get("file");
    const surface = formData.get("surface");
    if (!(input instanceof File) || (surface !== "post" && surface !== "reply")) return jsonError("FORUM_MEDIA_INVALID", 400);
    const media = await prepareForumMediaUpload(input, surface);
    const stored = await saveUploadedFile(media.file, { folder: "forum-media", access: "private", maxBytes: media.kind === "image" ? forumImageMaxBytes : forumVideoMaxBytes });
    storedPath = stored.filePath;
    const record = await prisma.forumAttachment.create({ data: { authorId: user.id, kind: media.kind, filePath: stored.filePath, mimeType: stored.mimeType, fileSize: stored.fileSize, originalName: media.originalName } });
    return NextResponse.json({ id: record.id, type: media.kind, url: getForumMediaUrl(record.id), mimeType: stored.mimeType }, { status: 201, headers: noStore });
  } catch (error) {
    if (storedPath) await deleteForumMediaStoredFile(storedPath).catch(() => {});
    const code = error instanceof Error ? error.message : "";
    if (code === "FORUM_MEDIA_TYPE") return jsonError(code, 415);
    if (code === "FORUM_MEDIA_SIZE") return jsonError(code, 413);
    if (error instanceof TypeError) return jsonError("FORUM_MEDIA_INVALID", 400);
    return jsonError("FORUM_MEDIA_UNAVAILABLE", 500);
  }
}

function jsonError(code: string, status: number) {
  return NextResponse.json({ code }, { status, headers: noStore });
}

async function readBoundedFormData(request: Request) {
  if (!request.body) throw new TypeError("Missing multipart body");
  let bytes = 0;
  const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > forumVideoMaxBytes + 1024 * 1024) throw new Error("FORUM_MEDIA_SIZE");
      controller.enqueue(chunk);
    },
  }));
  return new Response(bounded, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}
