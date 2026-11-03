import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { findChatMembership, getChatManagerScope, notifyChatUsers, recordGroupEvent, resolvePublicReference } from "@/lib/group-chat/service";
import { chatAnnouncementInclude, serializeChatAnnouncements } from "@/lib/group-chat/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  if (!(await findChatMembership(groupId, actor.id)) && !(await getChatManagerScope(groupId, actor))) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  const announcements = await prisma.chatGroupAnnouncement.findMany({ where: { groupId }, include: chatAnnouncementInclude, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 50 });
  return chatJson({ announcements: await serializeChatAnnouncements(announcements) });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  const manager = await getChatManagerScope(groupId, actor);
  if (!manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const pinned = body.pinned === true;
  const mediaId = typeof body.mediaId === "string" ? body.mediaId : null;
  const referenceInput = body.contentReference;
  if (referenceInput !== undefined && referenceInput !== null && (!referenceInput || typeof referenceInput !== "object" || Array.isArray(referenceInput))) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
  const contentReference = referenceInput && typeof referenceInput === "object" && !Array.isArray(referenceInput)
    ? referenceInput as { type?: unknown; id?: unknown }
    : null;
  const hasReference = contentReference !== null;
  if (body.mediaId !== undefined && body.mediaId !== null && mediaId === null) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
  if (hasReference && (typeof contentReference.type !== "string" || !["tool", "news"].includes(contentReference.type) || typeof contentReference.id !== "string" || !contentReference.id.trim())) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
  if (mediaId && hasReference) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
  if (Array.from(title).length < 2 || Array.from(title).length > 80 || Array.from(content).length < 1 || Array.from(content).length > 5000) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
  if (contentReference && !await resolvePublicReference(contentReference as { type: "tool" | "news"; id: string }, prisma)) return chatError("CHAT_REFERENCE_UNAVAILABLE", 409);
  if (mediaId) {
    const media = await prisma.chatGroupMedia.findFirst({ where: { id: mediaId, groupId, userId: actor.id, purpose: "announcement", messageId: null, discardedAt: null, expiresAt: { gt: new Date() }, announcement: { is: null } }, select: { id: true } });
    if (!media) return chatError("CHAT_MEDIA_UNAVAILABLE", 409);
  }
  try {
    const announcement = await prisma.$transaction(async (tx) => {
      const [currentGroup, currentMember] = await Promise.all([
        tx.chatGroup.findUnique({ where: { id: groupId }, select: { id: true, ownerId: true, name: true, status: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, select: { role: true, status: true } }),
      ]);
      const managerStillValid = actor.role === "admin" || currentGroup?.ownerId === actor.id || currentMember?.status === "active" && ["owner", "admin"].includes(currentMember.role);
      if (!managerStillValid || !currentGroup) throw new Error("CHAT_GROUP_MANAGER_REQUIRED");
      if (contentReference && !await resolvePublicReference(contentReference as { type: "tool" | "news"; id: string }, tx)) throw new Error("CHAT_REFERENCE_UNAVAILABLE");
      if (mediaId) {
        const attached = await tx.chatGroupMedia.updateMany({ where: { id: mediaId, groupId, userId: actor.id, purpose: "announcement", messageId: null, discardedAt: null, expiresAt: { gt: new Date() }, announcement: { is: null } }, data: { expiresAt: new Date("9999-12-31T23:59:59.999Z") } });
        if (attached.count !== 1) throw new Error("CHAT_MEDIA_UNAVAILABLE");
      }
      if (pinned && await tx.chatGroupAnnouncement.count({ where: { groupId, pinned: true } }) >= 3) throw new Error("CHAT_PIN_LIMIT");
      const item = await tx.chatGroupAnnouncement.create({ data: { groupId, createdById: actor.id, updatedById: actor.id, title, content, pinned, mediaId, referenceType: contentReference?.type as string | undefined, referenceId: contentReference?.id as string | undefined }, include: chatAnnouncementInclude });
      await recordChatAudit(tx, { groupId, adminId: actor.id, action: "announcement_created", targetId: item.id });
      await recordGroupEvent(tx, groupId, "announcement", { announcementId: item.id });
      const members = await tx.chatGroupMember.findMany({ where: { groupId, status: "active" }, select: { userId: true } });
      await notifyChatUsers(tx, members.map(({ userId }) => userId), actor.id, { type: "chat_group_announcement", title: `群聊公告：${currentGroup.name}`, content: title, linkUrl: `/chat/${groupId}?tab=announcements` });
      return item;
    }, { isolationLevel: "Serializable" });
    return chatJson({ announcement: (await serializeChatAnnouncements([announcement]))[0] }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = code === "CHAT_PIN_LIMIT" || code === "CHAT_MEDIA_UNAVAILABLE" || code === "CHAT_REFERENCE_UNAVAILABLE" ? 409 : code === "CHAT_GROUP_MANAGER_REQUIRED" ? 403 : 500;
    return chatError(status === 500 ? "CHAT_ANNOUNCEMENT_CREATE_FAILED" : code, status);
  }
}
