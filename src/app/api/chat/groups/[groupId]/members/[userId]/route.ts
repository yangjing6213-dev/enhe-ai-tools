import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { canModerateChatMember } from "@/lib/group-chat/policy";
import { getChatManagerScope, notifyChatUsers, recordGroupEvent } from "@/lib/group-chat/service";
import { chatMuteExpiry, groupChatMuteDurationsHours, isChatMemberMuted } from "@/lib/group-chat/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string; userId: string }> };
const actions = new Set(["mute", "unmute", "ban", "unban", "make_admin", "remove_admin"]);

function actorRole(input: { role: string; isOwner: boolean }) {
  return input.role === "admin" ? "site_admin" : input.isOwner ? "owner" : "admin";
}

function publicTargetRole(input: { ownerId: string; userId: string; role: string }) {
  return input.ownerId === input.userId ? "owner" : input.role === "admin" ? "admin" : "member";
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId, userId } = await params;
  const manager = await getChatManagerScope(groupId, actor);
  if (!manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);

  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const action = String(body.action ?? "");
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  if (!actions.has(action)) return chatError("CHAT_MEMBER_ACTION_INVALID", 400);
  const durationHours = action === "mute" ? (body.durationHours ?? 24) : null;
  if (action === "mute" && (typeof durationHours !== "number" || !groupChatMuteDurationsHours.includes(durationHours as (typeof groupChatMuteDurationsHours)[number]))) return chatError("CHAT_MUTE_DURATION_INVALID", 400);
  const mutedUntil = action === "mute" ? chatMuteExpiry(durationHours as number) : null;
  if (["make_admin", "remove_admin"].includes(action) && actor.role !== "admin") return chatError("CHAT_SITE_ADMIN_REQUIRED", 403);
  if (actor.id === userId) return chatError("CHAT_MEMBER_MODERATION_FORBIDDEN", 403);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const [group, actorMember, target] = await Promise.all([
        tx.chatGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, ownerId: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, select: { role: true, status: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { id: true, role: true, status: true, muted: true, mutedUntil: true } }),
      ]);
      if (!group) throw new Error("CHAT_GROUP_NOT_FOUND");
      const isSiteAdmin = actor.role === "admin";
      const isOwner = group.ownerId === actor.id || (actorMember?.status === "active" && actorMember.role === "owner");
      const isGroupAdmin = actorMember?.status === "active" && actorMember.role === "admin";
      if (!isSiteAdmin && !isOwner && !isGroupAdmin) throw new Error("CHAT_GROUP_MANAGER_REQUIRED");
      if (!target) throw new Error("CHAT_MEMBER_NOT_FOUND");
      const targetRole = publicTargetRole({ ownerId: group.ownerId, userId, role: target.role });
      if (!canModerateChatMember(actorRole({ role: actor.role, isOwner }), targetRole)) throw new Error("CHAT_MEMBER_MODERATION_FORBIDDEN");

      if (["make_admin", "remove_admin"].includes(action)) {
        if (targetRole === "owner") throw new Error("CHAT_OWNER_ROLE_FIXED");
        if (target.status !== "active") throw new Error("CHAT_MEMBER_NOT_ACTIVE");
        if (action === "remove_admin" && target.role !== "admin") throw new Error("CHAT_MEMBER_NOT_ADMIN");
        if (action === "make_admin" && target.role === "admin") return { role: "admin", status: target.status, muted: isChatMemberMuted({ muted: target.muted, mutedUntil: target.mutedUntil }), mutedUntil: target.mutedUntil };
        const role = action === "make_admin" ? "admin" : "member";
        await tx.chatGroupMember.update({ where: { id: target.id }, data: { role } });
        await recordChatAudit(tx, { groupId, adminId: actor.id, action: `member_${action}`, targetId: userId, reason: reason || null });
        await recordGroupEvent(tx, groupId, "member_role", { action });
        await notifyChatUsers(tx, [userId], actor.id, { type: `chat_group_member_${action}`, title: `群聊角色已更新：${group.name}`, content: role === "admin" ? "你已成为本群管理员。" : "你的本群管理员身份已撤销。", linkUrl: `/chat/${groupId}` });
        return { role, status: target.status, muted: isChatMemberMuted({ muted: target.muted, mutedUntil: target.mutedUntil }), mutedUntil: target.mutedUntil };
      }

      if (action === "unban") {
        if (target.status !== "banned") throw new Error("CHAT_MEMBER_NOT_BANNED");
        await tx.chatGroupMember.update({ where: { id: target.id }, data: { status: "left", statusChangedAt: null, muted: false, mutedUntil: null } });
      } else {
        if (target.status !== "active") throw new Error("CHAT_MEMBER_NOT_ACTIVE");
        if (["ban", "mute", "unmute"].includes(action) && ["owner", "admin"].includes(targetRole) && !isSiteAdmin && targetRole !== "member") {
          if (!canModerateChatMember(actorRole({ role: actor.role, isOwner }), targetRole)) throw new Error("CHAT_MEMBER_MODERATION_FORBIDDEN");
        }
        if (action === "mute" || action === "unmute") {
          await tx.chatGroupMember.update({ where: { id: target.id }, data: { muted: action === "mute", mutedUntil: action === "mute" ? mutedUntil : null } });
        } else {
          if (["owner", "admin"].includes(targetRole)) {
            const admins = await tx.chatGroupMember.count({ where: { groupId, status: "active", role: { in: ["owner", "admin"] } } });
            if (admins <= 1) throw new Error("CHAT_LAST_GROUP_ADMIN");
          }
          await tx.chatGroupMember.update({ where: { id: target.id }, data: { status: "banned", statusChangedAt: new Date(), muted: false, mutedUntil: null } });
          const changed = await tx.chatGroup.updateMany({ where: { id: groupId, activeMemberCount: { gt: 0 } }, data: { activeMemberCount: { decrement: 1 } } });
          if (changed.count !== 1) throw new Error("CHAT_GROUP_MEMBER_COUNT_CONFLICT");
        }
      }

      await recordChatAudit(tx, { groupId, adminId: actor.id, action: `member_${action}`, targetId: userId, reason: reason || null });
      await recordGroupEvent(tx, groupId, "member_status", { action });
      const status = action === "unban" ? "left" : action === "ban" ? "banned" : "active";
      const storedMuted = action === "mute" ? true : action === "unmute" || action === "unban" || action === "ban" ? false : target.muted;
      const storedMutedUntil = action === "mute" ? mutedUntil : action === "unmute" || action === "unban" || action === "ban" ? null : target.mutedUntil;
      const muted = isChatMemberMuted({ muted: storedMuted, mutedUntil: storedMutedUntil });
      await notifyChatUsers(tx, [userId], actor.id, {
        type: `chat_group_member_${action}`,
        title: `群聊成员状态已更新：${group.name}`,
        content: reason || (action === "unban" ? "你已解除本群封禁，可以重新申请加入。" : action === "ban" ? "你已被本群封禁。" : action === "mute" ? `你已被本群禁言 ${durationHours} 小时。` : "你的本群禁言已解除。"),
        linkUrl: action === "unban" ? "/chat?tab=discover" : `/chat/${groupId}`,
      });
      return { role: target.role, status, muted, mutedUntil: storedMutedUntil };
    }, { isolationLevel: "Serializable" });
    return chatJson({ updated: true, member: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = ["CHAT_MEMBER_MODERATION_FORBIDDEN", "CHAT_GROUP_MANAGER_REQUIRED"].includes(code) ? 403 : code === "CHAT_MEMBER_NOT_FOUND" || code === "CHAT_GROUP_NOT_FOUND" ? 404 : 409;
    return chatError(code.startsWith("CHAT_") ? code : "CHAT_MEMBER_UPDATE_FAILED", status);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId, userId } = await params;
  const leavingSelf = userId === actor.id;
  const manager = leavingSelf ? null : await getChatManagerScope(groupId, actor);
  if (!leavingSelf && !manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);

  try {
    await prisma.$transaction(async (tx) => {
      const [group, actorMember, target] = await Promise.all([
        tx.chatGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, ownerId: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, select: { role: true, status: true } }),
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { id: true, role: true, status: true } }),
      ]);
      if (!group || !target) throw new Error("CHAT_MEMBER_NOT_ACTIVE");
      if (target.status !== "active") throw new Error("CHAT_MEMBER_NOT_ACTIVE");
      const isSiteAdmin = actor.role === "admin";
      const isOwner = group.ownerId === actor.id || (actorMember?.status === "active" && actorMember.role === "owner");
      const isGroupAdmin = actorMember?.status === "active" && actorMember.role === "admin";
      if (leavingSelf) {
        if (!actorMember || actorMember.status !== "active") throw new Error("CHAT_MEMBER_NOT_ACTIVE");
      } else {
        if (!isSiteAdmin && !isOwner && !isGroupAdmin) throw new Error("CHAT_GROUP_MANAGER_REQUIRED");
        const targetRole = publicTargetRole({ ownerId: group.ownerId, userId, role: target.role });
        if (userId === actor.id || !canModerateChatMember(actorRole({ role: actor.role, isOwner }), targetRole)) throw new Error("CHAT_MEMBER_MODERATION_FORBIDDEN");
      }
      if (["owner", "admin"].includes(target.role)) {
        const admins = await tx.chatGroupMember.count({ where: { groupId, status: "active", role: { in: ["owner", "admin"] } } });
        if (admins <= 1) throw new Error("CHAT_LAST_GROUP_ADMIN");
      }
      await tx.chatGroupMember.update({ where: { id: target.id }, data: { status: "left", statusChangedAt: new Date(), muted: false, mutedUntil: null } });
      const changed = await tx.chatGroup.updateMany({ where: { id: groupId, activeMemberCount: { gt: 0 } }, data: { activeMemberCount: { decrement: 1 } } });
      if (changed.count !== 1) throw new Error("CHAT_GROUP_MEMBER_COUNT_CONFLICT");
      if (!leavingSelf) {
        await recordChatAudit(tx, { groupId, adminId: actor.id, action: "member_kicked", targetId: userId });
        await notifyChatUsers(tx, [userId], actor.id, { type: "chat_group_removed", title: `你已离开群聊：${group.name}`, content: "你已被移出该群。24 小时后可重新申请。", linkUrl: "/chat?tab=applications" });
      }
      await recordGroupEvent(tx, groupId, leavingSelf ? "member_left" : "member_removed", { action: leavingSelf ? "left" : "removed" });
    }, { isolationLevel: "Serializable" });
    return chatJson({ left: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const status = ["CHAT_MEMBER_MODERATION_FORBIDDEN", "CHAT_GROUP_MANAGER_REQUIRED"].includes(code) ? 403 : 409;
    return chatError(code.startsWith("CHAT_") ? code : "CHAT_MEMBER_UPDATE_FAILED", status);
  }
}
