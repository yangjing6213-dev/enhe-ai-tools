import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import sharp from "sharp";

import { forumAttachmentLifetimeMs, forumImageMaxBytes, forumVideoMaxBytes, type ForumMediaSurface } from "@/lib/forum-media-limits";
export { forumAttachmentLifetimeMs, forumImageMaxBytes, forumVideoMaxBytes, forumMediaUploadWindowMs, forumMediaUploadMax, forumMediaPendingMax, type ForumMediaSurface } from "@/lib/forum-media-limits";

type AttachmentSelection = { id: string; authorId: string; kind: string; fileSize: number; postId: string | null; replyId: string | null; discardedAt: Date | null; createdAt: Date };
type AttachmentAccess = { authorId: string; post: { status: string } | null; reply: { status: string; post: { status: string } } | null };
const imageFormats: Record<string, { mime: string; format: string }> = {
  ".jpg": { mime: "image/jpeg", format: "jpeg" },
  ".jpeg": { mime: "image/jpeg", format: "jpeg" },
  ".png": { mime: "image/png", format: "png" },
  ".webp": { mime: "image/webp", format: "webp" },
  ".gif": { mime: "image/gif", format: "gif" },
};

export function getForumMediaUrl(id: string) {
  return `/api/forum/media/${encodeURIComponent(id)}`;
}

export function isForumMediaSameOriginRequest(request: Request) {
  const origins = new Set([new URL(request.url).origin]);
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try { if (value) origins.add(new URL(value).origin); } catch { /* Ignore invalid optional configuration. */ }
  }
  const origin = request.headers.get("origin");
  if (origin) return origins.has(origin);
  try { return origins.has(new URL(request.headers.get("referer") ?? "").origin); } catch { return false; }
}

export function readForumAttachmentIds(formData: FormData, surface: ForumMediaSurface) {
  const entries = formData.getAll("attachmentIds");
  if (entries.length > (surface === "post" ? 7 : 4) || entries.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) throw new Error("FORUM_INVALID_ATTACHMENTS");
  const ids = entries as string[];
  if (new Set(ids).size !== ids.length) throw new Error("FORUM_INVALID_ATTACHMENTS");
  return ids;
}

export function assertForumAttachmentSelection(ids: string[], attachments: AttachmentSelection[], authorId: string, surface: ForumMediaSurface, now = Date.now()) {
  const invalid = () => { throw new Error("FORUM_INVALID_ATTACHMENTS"); };
  if (ids.length !== attachments.length || new Set(ids).size !== ids.length) invalid();
  let images = 0;
  let videos = 0;
  for (const item of attachments) {
    if (!ids.includes(item.id) || item.authorId !== authorId || item.postId || item.replyId || item.discardedAt !== null || item.createdAt.getTime() < now - forumAttachmentLifetimeMs) invalid();
    if (!Number.isInteger(item.fileSize) || item.fileSize <= 0) invalid();
    if (item.kind === "image" && item.fileSize <= forumImageMaxBytes) images += 1;
    else if (item.kind === "video" && item.fileSize <= forumVideoMaxBytes) videos += 1;
    else invalid();
  }
  if (images > (surface === "post" ? 6 : 4) || videos > (surface === "post" ? 1 : 0)) invalid();
}

export function isForumAttachmentPublic(item: AttachmentAccess) {
  return Boolean(item.post?.status === "approved" || (item.reply?.status === "approved" && item.reply.post.status === "approved"));
}

export function canReadForumAttachment(item: AttachmentAccess, user: { id: string; role: string } | null) {
  return isForumAttachmentPublic(item) || Boolean(user && (user.id === item.authorId || user.role === "admin"));
}

export function parseForumMediaRange(value: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (value === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) return "invalid";
  const suffix = !match[1];
  const first = Number(match[1] || match[2]);
  const start = suffix ? Math.max(0, size - first) : first;
  const end = suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (!Number.isSafeInteger(first) || (suffix && first <= 0) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return "invalid";
  return { start, end };
}

export async function prepareForumMediaUpload(input: File, surface: ForumMediaSurface) {
  const extension = extname(input.name).toLowerCase();
  const image = imageFormats[extension];
  const video = surface === "post" && ((extension === ".mp4" && input.type === "video/mp4") || (extension === ".webm" && input.type === "video/webm"));
  if ((!image || input.type !== image.mime) && !video) throw new Error("FORUM_MEDIA_TYPE");
  const maxBytes = image ? forumImageMaxBytes : forumVideoMaxBytes;
  if (input.size <= 0 || input.size > maxBytes) throw new Error("FORUM_MEDIA_SIZE");
  const buffer = Buffer.from(await input.arrayBuffer());
  const originalName = input.name.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 160) || "media";
  if (image) {
    try {
      const decoder = sharp(buffer, { limitInputPixels: 24_000_000, animated: true, failOn: "warning" });
      const metadata = await decoder.metadata();
      if (metadata.format !== image.format || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 100 || metadata.width * metadata.height > 24_000_000) throw new Error("FORUM_MEDIA_TYPE");
      const normalized = await decoder.rotate().webp({ quality: 85 }).toBuffer();
      if (normalized.length > forumImageMaxBytes) throw new Error("FORUM_MEDIA_SIZE");
      return { kind: "image" as const, originalName, file: new File([new Uint8Array(normalized)], `${randomUUID()}.webp`, { type: "image/webp" }) };
    } catch (error) {
      if (error instanceof Error && error.message === "FORUM_MEDIA_SIZE") throw error;
      throw new Error("FORUM_MEDIA_TYPE");
    }
  }
  if (extension === ".mp4") {
    const boxSize = buffer.length >= 16 ? buffer.readUInt32BE(0) : 0;
    const brands = boxSize >= 16 && boxSize <= Math.min(buffer.length, 4096) && buffer.toString("ascii", 4, 8) === "ftyp"
      ? buffer.toString("ascii", 8, boxSize) : "";
    if (!/(isom|iso[2-9]|mp4[12]|avc1|dash|M4V |msdh|msix)/.test(brands) || brands.startsWith("qt  ")) throw new Error("FORUM_MEDIA_TYPE");
  } else {
    const header = buffer.subarray(0, 4096);
    if (!header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) || !header.includes(Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]))) throw new Error("FORUM_MEDIA_TYPE");
  }
  return { kind: "video" as const, originalName, file: new File([new Uint8Array(buffer)], `${randomUUID()}${extension}`, { type: input.type }) };
}
