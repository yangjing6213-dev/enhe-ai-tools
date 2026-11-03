import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest } from "@/lib/group-chat/http";
import { deleteChatMediaStoredFile, readChatMediaUrl } from "@/lib/group-chat/media-storage";
import { verifyChatInviteToken } from "@/lib/group-chat/security";
import { getChatManagerScope } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ mediaId: string }> };
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff", "Content-Type": "image/webp" };

export async function GET(request: Request, { params }: Context) {
  const { mediaId } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(mediaId)) return unavailable();
  const media = await prisma.chatGroupMedia.findUnique({ where: { id: mediaId }, include: { group: { select: { id: true, visibility: true, status: true, invite: { select: { tokenHash: true, pausedAt: true, expiresAt: true } } } }, message: { select: { status: true } }, announcement: { select: { id: true, groupId: true } } } });
  if (!media || media.discardedAt || media.group.status === "disabled") return unavailable();
  const actor = await getCurrentUser();
  const membership = actor ? await prisma.chatGroupMember.findUnique({ where: { groupId_userId: { groupId: media.groupId, userId: actor.id } }, select: { status: true } }) : null;
  const memberAccess = membership?.status === "active";
  const managerAccess = actor ? Boolean(await getChatManagerScope(media.groupId, actor)) : false;
  const ownDraft = actor?.id === media.userId && !media.messageId && media.purpose === "message" && media.expiresAt > new Date();
  const ownAnnouncementDraft = actor?.id === media.userId && media.purpose === "announcement" && !media.announcement && media.expiresAt > new Date() && managerAccess;
  const announcementAccess = media.purpose === "announcement" && Boolean(media.announcement && media.announcement.groupId === media.groupId && (memberAccess || managerAccess));
  let inviteAccess = false;
  if (media.purpose === "avatar" && media.group.visibility === "invite_only" && !memberAccess) {
    const token = new URL(request.url).searchParams.get("invite") ?? "";
    const invite = media.group.invite;
    inviteAccess = Boolean(invite && token && verifyChatInviteToken(token, invite.tokenHash) && !invite.pausedAt && (!invite.expiresAt || invite.expiresAt > new Date()));
  }
  if (media.purpose === "message" && (media.messageId ? media.message?.status !== "active" || !memberAccess : !ownDraft || !memberAccess)) return unavailable();
  if (media.purpose === "announcement" && !announcementAccess && !ownAnnouncementDraft) return unavailable();
  if (media.purpose === "avatar" && !memberAccess && media.group.visibility !== "listed" && !inviteAccess) return unavailable();
  const path = new URL(request.url).searchParams.get("variant") === "thumbnail" ? media.thumbnailPath : media.filePath;
  const location = await readChatMediaUrl(path);
  if (!location) return unavailable();
  try {
    const size = typeof location === "string" ? (await stat(location)).size : undefined;
    if (size && size > 10 * 1024 * 1024) return unavailable();
    if (location instanceof URL) {
      const upstream = await fetch(location, { redirect: "error", cache: "no-store", signal: request.signal });
      if (!upstream.ok || !upstream.body) return unavailable();
      return new Response(upstream.body, { status: 200, headers: { ...headers, "Content-Length": upstream.headers.get("content-length") ?? String(media.fileSize) } });
    }
    return new Response(Readable.toWeb(createReadStream(location)) as ReadableStream<Uint8Array>, { headers: { ...headers, "Content-Length": String(size) } });
  } catch {
    return unavailable();
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { mediaId } = await params;
  const media = await prisma.chatGroupMedia.findUnique({ where: { id: mediaId }, select: { id: true, userId: true, groupId: true, messageId: true, purpose: true, filePath: true, thumbnailPath: true, discardedAt: true } });
  if (!media || media.userId !== actor.id || media.messageId || media.purpose !== "message") return unavailable();
  const now = new Date();
  const marked = await prisma.chatGroupMedia.updateMany({ where: { id: mediaId, userId: actor.id, messageId: null, discardedAt: null }, data: { discardedAt: now } });
  if (marked.count !== 1) return chatError("CHAT_MEDIA_NOT_AVAILABLE", 409);
  const filesRemoved = await Promise.all([deleteChatMediaStoredFile(media.filePath), deleteChatMediaStoredFile(media.thumbnailPath)]);
  if (filesRemoved.every(Boolean)) await prisma.chatGroupMedia.deleteMany({ where: { id: mediaId, discardedAt: now } });
  return chatJson({ removed: true });
}

function unavailable() {
  return chatError("CHAT_MEDIA_NOT_AVAILABLE", 404);
}
