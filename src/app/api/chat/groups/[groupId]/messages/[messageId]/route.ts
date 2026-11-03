import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { findChatMembership, getChatManagerScope, notifyChatUsers, recordGroupEvent } from "@/lib/group-chat/service";
import { deleteChatMediaStoredFile } from "@/lib/group-chat/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string; messageId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId, messageId } = await params;
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const action = body.action;
  if (action !== "retract" && action !== "remove" && action !== "pin" && action !== "unpin") return chatError("CHAT_MESSAGE_ACTION_INVALID", 400);
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  if (action === "remove" && !reason) return chatError("CHAT_REMOVAL_REASON_REQUIRED", 400);
  const membership = await findChatMembership(groupId, actor.id);
  const manager = await getChatManagerScope(groupId, actor);
  if (!membership && !manager) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  if ((action === "remove" || action === "pin" || action === "unpin") && !manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);

  let files: Array<{ id: string; filePath: string; thumbnailPath: string }> = [];
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [message, group, actorMember] = await Promise.all([
        tx.chatGroupMessage.findFirst({ where: { id: messageId, groupId, status: "active" }, include: { media: { where: { discardedAt: null }, select: { id: true, filePath: true, thumbnailPath: true } } } }),
        tx.chatGroup.findUnique({ where: { id: groupId }, select: { ownerId: true, status: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, select: { status: true, role: true } }),
      ]);
      if (!message || !group) throw new Error("CHAT_MESSAGE_NOT_FOUND");
      const isManager = actor.role === "admin" || group.ownerId === actor.id || (actorMember?.status === "active" && actorMember.role === "admin");
      if (action === "retract") {
        if (!actorMember || actorMember.status !== "active") throw new Error("CHAT_GROUP_MEMBER_REQUIRED");
        if (message.senderId !== actor.id) throw new Error("CHAT_RETRACT_FORBIDDEN");
        if (Date.now() - message.createdAt.getTime() > 2 * 60 * 1000) throw new Error("CHAT_RETRACT_EXPIRED");
      } else if (!isManager) {
        throw new Error("CHAT_GROUP_MANAGER_REQUIRED");
      }
      if (action === "pin" || action === "unpin") {
        if (action === "pin" && !message.pinnedAt) {
          const pinnedCount = await tx.chatGroupMessage.count({ where: { groupId, status: "active", pinnedAt: { not: null } } });
          if (pinnedCount >= 3) throw new Error("CHAT_PIN_LIMIT");
        }
        await tx.chatGroupMessage.update({ where: { id: message.id }, data: { pinnedAt: action === "pin" ? new Date() : null } });
        await recordGroupEvent(tx, groupId, "message_pin", { action }, message.id);
        await recordChatAudit(tx, { groupId, adminId: actor.id, action: `message_${action}`, targetId: message.id });
        return { status: "active", pinned: action === "pin" };
      }
      const now = new Date();
      const changed = await tx.chatGroupMessage.updateMany({
        where: { id: message.id, groupId, status: "active", ...(action === "retract" ? { senderId: actor.id, createdAt: { gte: new Date(now.getTime() - 2 * 60 * 1000) } } : {}) },
        data: { status: action === "retract" ? "retracted" : "removed", pinnedAt: null, retractedAt: action === "retract" ? now : null, removedAt: action === "remove" ? now : null, removedReason: action === "remove" ? reason : null },
      });
      if (changed.count !== 1) throw new Error(action === "retract" ? "CHAT_RETRACT_EXPIRED" : "CHAT_MESSAGE_NOT_FOUND");
      files = message.media;
      if (files.length) await tx.chatGroupMedia.updateMany({ where: { id: { in: files.map(({ id }) => id) }, messageId: message.id, discardedAt: null }, data: { discardedAt: now, expiresAt: now } });
      await tx.notification.updateMany({ where: { linkUrl: { contains: `message=${message.id}` } }, data: { title: "群聊消息已不可用", content: "这条消息已撤回或移除。" } });
      await recordGroupEvent(tx, groupId, action === "retract" ? "message_retracted" : "message_removed", { action, reason: action === "remove" ? reason : "" }, message.id);
      if (action === "remove") await recordChatAudit(tx, { groupId, adminId: actor.id, action: "message_removed", targetId: message.id, reason });
      return { status: action === "retract" ? "retracted" : "removed" };
    }, { isolationLevel: "Serializable" });
    await Promise.allSettled(files.flatMap(({ filePath, thumbnailPath }) => [deleteChatMediaStoredFile(filePath), deleteChatMediaStoredFile(thumbnailPath)]));
    return chatJson({ updated: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CHAT_PIN_LIMIT") return chatError(code, 409);
    const status = code.endsWith("FORBIDDEN") || code === "CHAT_GROUP_MEMBER_REQUIRED" || code === "CHAT_GROUP_MANAGER_REQUIRED" ? 403 : code === "CHAT_MESSAGE_NOT_FOUND" ? 404 : 409;
    return chatError(code.startsWith("CHAT_") ? code : "CHAT_MESSAGE_UPDATE_FAILED", status);
  }
}
