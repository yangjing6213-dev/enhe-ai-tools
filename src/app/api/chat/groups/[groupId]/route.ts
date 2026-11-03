import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupUpdateInputSchema, isChatMemberMuted } from "@/lib/group-chat/policy";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { getChatManagerScope } from "@/lib/group-chat/service";
import { chatAnnouncementInclude, serializeChatAnnouncements } from "@/lib/group-chat/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { groupId } = await params;
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    include: {
      members: { where: { status: "active" }, include: { user: { select: { id: true, nickname: true, avatar: true, role: true } } }, orderBy: { joinedAt: "asc" } },
      announcements: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 10, include: chatAnnouncementInclude },
      applications: { where: { userId: actor.id }, orderBy: { submittedAt: "desc" }, take: 1, select: { id: true, status: true, rejectionReason: true, submittedAt: true } },
    },
  });
  if (!group) return chatError("CHAT_GROUP_NOT_FOUND", 404);
  const ownMember = group.members.find((member) => member.userId === actor.id);
  const manager = await getChatManagerScope(groupId, actor);
  const isMember = ownMember?.status === "active";
  if (group.status === "disabled" && !manager && !isMember) return chatError("CHAT_GROUP_UNAVAILABLE", 404);
  if (!isMember && !manager && group.visibility !== "listed" && !group.applications.length) return chatError("CHAT_GROUP_NOT_FOUND", 404);
  const { ownerId: _ownerId, members, applications, announcements, ...publicGroup } = group;
  const safeAnnouncements = await serializeChatAnnouncements(announcements);
  return chatJson({
    group: { ...publicGroup, announcements: safeAnnouncements, readOnly: publicGroup.readOnly || publicGroup.status !== "active" },
    member: ownMember ? { role: ownMember.role, muted: isChatMemberMuted({ muted: ownMember.muted, mutedUntil: ownMember.mutedUntil }), mutedUntil: ownMember.mutedUntil, lastReadSequence: ownMember.lastReadSequence } : null,
    members: isMember || manager ? members.map(({ user, role, joinedAt, muted, mutedUntil }) => ({ ...user, nickname: user.nickname?.trim() || "ENHE 用户", role, joinedAt, muted: isChatMemberMuted({ muted, mutedUntil }), mutedUntil })) : [],
    application: applications[0] ?? null,
    isManager: Boolean(manager),
    isSiteAdmin: Boolean(manager?.isSiteAdmin),
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  const manager = await getChatManagerScope(groupId, actor);
  if (!manager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  let parsed;
  try { parsed = groupUpdateInputSchema.safeParse(await readChatJson(request)); } catch { return chatError("CHAT_INVALID_JSON", 400); }
  if (!parsed.success) return chatError("CHAT_GROUP_INPUT_INVALID", 400);
  if (parsed.data.status && !manager.isSiteAdmin) return chatError("CHAT_SITE_ADMIN_REQUIRED_FOR_STATUS", 403);
  if (parsed.data.maxMembers !== undefined && parsed.data.maxMembers < manager.group.activeMemberCount) return chatError("CHAT_CAPACITY_BELOW_MEMBER_COUNT", 409);
  if (parsed.data.avatarMediaId !== undefined && parsed.data.avatarMediaId !== null) {
    const media = await prisma.chatGroupMedia.findFirst({ where: { id: parsed.data.avatarMediaId, groupId, purpose: "avatar", userId: actor.id, discardedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!media) return chatError("CHAT_AVATAR_UNAVAILABLE", 400);
  }
  const { discoverability, status, ...fields } = parsed.data;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const data = { ...fields, ...(discoverability ? { visibility: discoverability } : {}), ...(status ? { status } : {}) };
      const group = await tx.chatGroup.update({ where: { id: groupId }, data, select: { id: true, name: true, description: true, rules: true, visibility: true, allowMemberInvites: true, pauseJoins: true, maxMembers: true, readOnly: true, status: true, avatarMediaId: true } });
      if (parsed.data.avatarMediaId) await tx.chatGroupMedia.update({ where: { id: parsed.data.avatarMediaId }, data: { expiresAt: new Date("9999-12-31T23:59:59.999Z") } });
      if (parsed.data.avatarMediaId !== undefined && manager.group.avatarMediaId && manager.group.avatarMediaId !== parsed.data.avatarMediaId) {
        await tx.chatGroupMedia.updateMany({ where: { id: manager.group.avatarMediaId, messageId: null }, data: { expiresAt: new Date() } });
      }
      await recordChatAudit(tx, { groupId, adminId: actor.id, action: "group_updated", metadata: { fields: Object.keys(parsed.data) } });
      return group;
    });
    return chatJson({ group: updated });
  } catch {
    return chatError("CHAT_GROUP_UPDATE_FAILED", 500);
  }
}
