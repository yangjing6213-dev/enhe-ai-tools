import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupChatCopy } from "@/lib/group-chat/constants";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest } from "@/lib/group-chat/http";
import { normalizeChatImage } from "@/lib/group-chat/media";
import { deleteChatMediaStoredFile } from "@/lib/group-chat/media-storage";
import { findChatMembership, getChatManagerScope } from "@/lib/group-chat/service";
import { saveUploadedFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const maxRequestBytes = groupChatCopy.maxImageBytes + 512 * 1024;

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return chatError("CHAT_MEDIA_TYPE", 415);
  const length = Number(request.headers.get("content-length"));
  if (length > maxRequestBytes) return chatError("CHAT_MEDIA_SIZE", 413);
  try {
    const form = await readBoundedFormData(request);
    const groupId = form.get("groupId");
    const requestedPurpose = form.get("purpose");
    const purpose = requestedPurpose === "avatar" || requestedPurpose === "announcement" ? requestedPurpose : "message";
    const input = form.get("file");
    if (typeof groupId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(groupId) || !(input instanceof File)) return chatError("CHAT_MEDIA_INVALID", 400);
    const manager = purpose !== "message" ? await getChatManagerScope(groupId, actor) : null;
    const member = purpose === "message" ? await findChatMembership(groupId, actor.id) : null;
    if (purpose !== "message" && !manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
    if (purpose === "message" && !member) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
    if (member?.muted) return chatError("CHAT_MEMBER_MUTED", 403);
    if (member && (member.group.readOnly || member.group.status !== "active")) return chatError("CHAT_GROUP_READ_ONLY", 409);
    const quota = purpose === "message" ? groupChatCopy.imageUploadLimit : 10;
    if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "media_upload", limit: quota, windowMs: groupChatCopy.imageUploadWindowMs }))) return chatError("CHAT_RATE_LIMIT", 429);
    const [recentCount, pendingCount] = await Promise.all([
      prisma.chatGroupMedia.count({ where: { userId: actor.id, createdAt: { gte: new Date(Date.now() - groupChatCopy.imageUploadWindowMs) } } }),
      prisma.chatGroupMedia.count({ where: { userId: actor.id, groupId, messageId: null, discardedAt: null, expiresAt: { gt: new Date() }, purpose: "message" } }),
    ]);
    if (recentCount >= quota || (purpose === "message" && pendingCount >= groupChatCopy.pendingImageLimit)) return chatError("CHAT_MEDIA_LIMIT", 429);
    const normalized = await normalizeChatImage(input, groupChatCopy.maxImageBytes);
    const originalStored = await saveUploadedFile(normalized.file, { folder: "chat-media", access: "private", maxBytes: groupChatCopy.maxImageBytes });
    let thumbnailStored: Awaited<ReturnType<typeof saveUploadedFile>> | null = null;
    try {
      thumbnailStored = await saveUploadedFile(normalized.thumbnail, { folder: "chat-media", access: "private", maxBytes: groupChatCopy.maxImageBytes });
      const media = await prisma.chatGroupMedia.create({
        data: {
          groupId,
          userId: actor.id,
          purpose,
          originalName: normalized.originalName,
          originalBytes: normalized.originalBytes,
          filePath: originalStored.filePath,
          thumbnailPath: thumbnailStored.filePath,
          mimeType: "image/webp",
          fileSize: originalStored.fileSize,
          thumbnailSize: thumbnailStored.fileSize,
          width: normalized.width,
          height: normalized.height,
          expiresAt: new Date(Date.now() + groupChatCopy.imageLifetimeMs),
        },
        select: { id: true, width: true, height: true, expiresAt: true },
      });
      return chatJson({ ...media, url: `/api/chat/media/${encodeURIComponent(media.id)}`, thumbnailUrl: `/api/chat/media/${encodeURIComponent(media.id)}?variant=thumbnail` }, 201);
    } catch (error) {
      await deleteChatMediaStoredFile(originalStored.filePath).catch(() => false);
      if (thumbnailStored) await deleteChatMediaStoredFile(thumbnailStored.filePath).catch(() => false);
      throw error;
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CHAT_MEDIA_SIZE") return chatError(code, 413);
    if (code === "CHAT_MEDIA_TYPE") return chatError(code, 415);
    if (code === "CHAT_BODY_TOO_LARGE") return chatError(code, 413);
    return chatError("CHAT_MEDIA_UNAVAILABLE", 500);
  }
}

async function readBoundedFormData(request: Request) {
  if (!request.body) throw new Error("CHAT_MEDIA_INVALID");
  let bytes = 0;
  const bounded = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > maxRequestBytes) throw new Error("CHAT_BODY_TOO_LARGE");
      controller.enqueue(chunk);
    },
  }));
  return new Response(bounded, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}
