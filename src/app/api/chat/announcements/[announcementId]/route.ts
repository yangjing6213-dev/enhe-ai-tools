import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { getChatManagerScope, recordGroupEvent } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ announcementId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { announcementId } = await params;
  const current = await prisma.chatGroupAnnouncement.findUnique({ where: { id: announcementId }, select: { id: true, groupId: true } });
  if (!current) return chatError("CHAT_ANNOUNCEMENT_NOT_FOUND", 404);
  if (!(await getChatManagerScope(current.groupId, actor))) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const data: { title?: string; content?: string; pinned?: boolean } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || Array.from(body.title.trim()).length < 2 || Array.from(body.title.trim()).length > 80) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
    data.title = body.title.trim();
  }
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || !body.content.trim() || Array.from(body.content.trim()).length > 5000) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
    data.content = body.content.trim();
  }
  if (body.pinned !== undefined) {
    if (typeof body.pinned !== "boolean") return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
    data.pinned = body.pinned;
  }
  if (!Object.keys(data).length) return chatError("CHAT_ANNOUNCEMENT_INVALID", 400);
  try {
    const item = await prisma.$transaction(async (tx) => {
      if (data.pinned && await tx.chatGroupAnnouncement.count({ where: { groupId: current.groupId, pinned: true, id: { not: current.id } } }) >= 3) throw new Error("CHAT_PIN_LIMIT");
      const updated = await tx.chatGroupAnnouncement.update({ where: { id: current.id }, data: { ...data, updatedById: actor.id }, select: { id: true, title: true, content: true, pinned: true, updatedAt: true } });
      await recordChatAudit(tx, { groupId: current.groupId, adminId: actor.id, action: "announcement_updated", targetId: updated.id });
      await recordGroupEvent(tx, current.groupId, "announcement", { announcementId: updated.id });
      return updated;
    }, { isolationLevel: "Serializable" });
    return chatJson({ announcement: item });
  } catch (error) {
    return chatError(error instanceof Error && error.message === "CHAT_PIN_LIMIT" ? "CHAT_PIN_LIMIT" : "CHAT_ANNOUNCEMENT_UPDATE_FAILED", error instanceof Error && error.message === "CHAT_PIN_LIMIT" ? 409 : 500);
  }
}
