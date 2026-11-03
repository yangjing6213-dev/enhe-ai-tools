import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { getChatManagerScope, notifyChatUsers } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ applicationId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { applicationId } = await params;
  const application = await prisma.chatGroupApplication.findUnique({ where: { id: applicationId }, select: { id: true, groupId: true, userId: true, status: true } });
  if (!application || application.userId !== actor.id) return chatError("CHAT_APPLICATION_NOT_FOUND", 404);
  if (application.status !== "pending") return chatError("CHAT_APPLICATION_NOT_PENDING", 409);
  const updated = await prisma.chatGroupApplication.updateMany({ where: { id: applicationId, userId: actor.id, status: "pending" }, data: { status: "withdrawn", reviewedAt: new Date() } });
  if (updated.count !== 1) return chatError("CHAT_APPLICATION_NOT_PENDING", 409);
  return chatJson({ withdrawn: true });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { applicationId } = await params;
  let body: Record<string, unknown>;
  try { body = (await readChatJson(request)) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (action !== "approve" && action !== "reject") return chatError("CHAT_APPLICATION_ACTION_INVALID", 400);
  if (action === "reject" && (!reason || Array.from(reason).length > 2000)) return chatError("CHAT_REJECTION_REASON_REQUIRED", 400);
  const application = await prisma.chatGroupApplication.findUnique({ where: { id: applicationId }, select: { id: true, groupId: true, userId: true, status: true } });
  if (!application) return chatError("CHAT_APPLICATION_NOT_FOUND", 404);
  const manager = await getChatManagerScope(application.groupId, actor);
  if (!manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  if (application.status !== "pending") return chatError("CHAT_APPLICATION_NOT_PENDING", 409);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [currentApplication, user, group, currentMember] = await Promise.all([
        tx.chatGroupApplication.findUnique({ where: { id: applicationId }, select: { id: true, groupId: true, userId: true, status: true } }),
        tx.user.findUnique({ where: { id: application.userId }, select: { status: true, nickname: true } }),
        tx.chatGroup.findUnique({ where: { id: application.groupId }, select: { id: true, name: true, status: true, pauseJoins: true, activeMemberCount: true, maxMembers: true, lastSequence: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId: application.groupId, userId: application.userId } } }),
      ]);
      if (!currentApplication || currentApplication.status !== "pending") throw new Error("CHAT_APPLICATION_NOT_PENDING");
      if (!user || user.status !== "active") throw new Error("CHAT_APPLICANT_UNAVAILABLE");
      if (!group) throw new Error("CHAT_GROUP_NOT_FOUND");
      if (currentMember?.status === "active") throw new Error("CHAT_ALREADY_MEMBER");
      if (currentMember?.status === "banned") throw new Error("CHAT_MEMBER_BANNED");
      const nextStatus = action === "approve" ? "approved" : "rejected";
      if (action === "approve") {
        if (group.status !== "active" || group.pauseJoins) throw new Error("CHAT_JOIN_PAUSED");
        const reserved = await tx.$executeRaw(Prisma.sql`
          UPDATE "chat_groups"
          SET "active_member_count" = "active_member_count" + 1, "updated_at" = CURRENT_TIMESTAMP
          WHERE "id" = ${group.id}
            AND "status" = 'active'
            AND "pause_joins" = false
            AND "active_member_count" < "max_members"
        `);
        if (reserved !== 1) throw new Error("CHAT_GROUP_FULL");
        if (currentMember) {
          await tx.chatGroupMember.update({ where: { id: currentMember.id }, data: { status: "active", role: "member", muted: false, statusChangedAt: null, joinedAt: new Date(), lastReadSequence: group.lastSequence } });
        } else {
          await tx.chatGroupMember.create({ data: { groupId: group.id, userId: application.userId, role: "member", status: "active", lastReadSequence: group.lastSequence } });
        }
      }
      const changed = await tx.chatGroupApplication.updateMany({
        where: { id: applicationId, groupId: group.id, userId: application.userId, status: "pending" },
        data: { status: nextStatus, rejectionReason: action === "reject" ? reason : null, reviewedById: actor.id, reviewedAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("CHAT_APPLICATION_NOT_PENDING");
      await recordChatAudit(tx, { groupId: group.id, adminId: actor.id, action: `application_${action}`, targetId: applicationId, reason: action === "reject" ? reason : null });
      await notifyChatUsers(tx, [application.userId], actor.id, {
        type: action === "approve" ? "chat_group_application_approved" : "chat_group_application_rejected",
        title: action === "approve" ? `已加入群聊：${group.name}` : `入群申请未通过：${group.name}`,
        content: action === "approve" ? "你的入群申请已通过，可以开始群聊。" : reason,
        linkUrl: action === "approve" ? `/chat/${group.id}` : `/chat?tab=applications`,
      });
      return { status: nextStatus };
    }, { isolationLevel: "Serializable" });
    return chatJson(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["CHAT_APPLICATION_NOT_PENDING", "CHAT_APPLICANT_UNAVAILABLE", "CHAT_GROUP_NOT_FOUND", "CHAT_ALREADY_MEMBER", "CHAT_MEMBER_BANNED", "CHAT_JOIN_PAUSED", "CHAT_GROUP_FULL"].includes(code)) return chatError(code, 409);
    return chatError("CHAT_APPLICATION_REVIEW_FAILED", 500);
  }
}
