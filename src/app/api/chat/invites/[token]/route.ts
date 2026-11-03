import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupApplicationInputSchema, hasChatRejoinCooldown } from "@/lib/group-chat/policy";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";
import { notifyChatUsers } from "@/lib/group-chat/service";
import { hashChatInviteToken, verifyChatInviteToken } from "@/lib/group-chat/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string }> };

async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const invite = await prisma.chatGroupInvite.findFirst({
    where: { tokenHash: hashChatInviteToken(token) },
    include: { group: { select: { id: true, ownerId: true, name: true, description: true, rules: true, avatarMediaId: true, visibility: true, pauseJoins: true, status: true, activeMemberCount: true, maxMembers: true, readOnly: true } } },
  });
  if (!invite || !verifyChatInviteToken(token, invite.tokenHash)) return null;
  return invite;
}

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  const [invite, actor] = await Promise.all([findInvite(token), getCurrentUser()]);
  if (!invite) return chatJson({ inviteStatus: "invalid" });
  const { ownerId: _ownerId, ...publicGroup } = invite.group;
  const valid = invite.group.status === "active" && !invite.pausedAt && (!invite.expiresAt || invite.expiresAt > new Date());
  if (!valid) return chatJson({ inviteStatus: invite.group.status !== "active" ? "closed" : invite.pausedAt ? "paused" : "expired", group: publicGroup });

  let application: { id: string; status: string; submittedAt: Date; rejectionReason: string | null } | null = null;
  let membership: { status: string } | null = null;
  if (actor) {
    [application, membership] = await Promise.all([
      prisma.chatGroupApplication.findFirst({ where: { groupId: invite.groupId, userId: actor.id }, select: { id: true, status: true, submittedAt: true, rejectionReason: true }, orderBy: { submittedAt: "desc" } }),
      prisma.chatGroupMember.findUnique({ where: { groupId_userId: { groupId: invite.groupId, userId: actor.id } }, select: { status: true } }),
    ]);
  }
  return chatJson({ inviteStatus: "active", group: publicGroup, application, membership });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { token } = await params;
  const invite = await findInvite(token);
  if (!invite) return chatError("CHAT_INVITE_INVALID", 404);
  const now = new Date();
  if (invite.group.status !== "active" || invite.pausedAt || (invite.expiresAt && invite.expiresAt <= now)) return chatError("CHAT_INVITE_UNAVAILABLE", 410);
  if (invite.group.pauseJoins) return chatError("CHAT_JOIN_PAUSED", 409);
  if (invite.group.activeMemberCount >= invite.group.maxMembers) return chatError("CHAT_GROUP_FULL", 409);
  if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${invite.groupId}`, action: "apply", limit: 5, windowMs: 60 * 60 * 1000 }))) return chatError("CHAT_RATE_LIMIT", 429);

  let input;
  try { input = groupApplicationInputSchema.safeParse(await readChatJson(request)); } catch { return chatError("CHAT_INVALID_JSON", 400); }
  if (!input.success) return chatError("CHAT_APPLICATION_INVALID", 400);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [member, previous, activeGroup] = await Promise.all([
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId: invite.groupId, userId: actor.id } } }),
        tx.chatGroupApplication.findFirst({ where: { groupId: invite.groupId, userId: actor.id, status: "rejected" }, orderBy: { reviewedAt: "desc" }, select: { reviewedAt: true } }),
        tx.chatGroup.findUnique({ where: { id: invite.groupId }, select: { status: true, pauseJoins: true, activeMemberCount: true, maxMembers: true } }),
      ]);
      if (!activeGroup || activeGroup.status !== "active") throw new Error("CHAT_GROUP_CLOSED");
      if (activeGroup.pauseJoins) throw new Error("CHAT_JOIN_PAUSED");
      if (activeGroup.activeMemberCount >= activeGroup.maxMembers) throw new Error("CHAT_GROUP_FULL");
      if (member?.status === "active") return { alreadyMember: true as const };
      if (member?.status === "banned") throw new Error("CHAT_MEMBER_BANNED");
      if (member?.statusChangedAt && now.getTime() - member.statusChangedAt.getTime() < 24 * 60 * 60 * 1000) throw new Error("CHAT_REJOIN_COOLDOWN");
      if (hasChatRejoinCooldown({ memberStatus: member?.status ?? null, statusChangedAt: member?.statusChangedAt ?? null, applicationStatus: previous ? "rejected" : null, applicationAt: previous?.reviewedAt ?? null, now })) throw new Error("CHAT_REJOIN_COOLDOWN");
      const pending = await tx.chatGroupApplication.findFirst({ where: { groupId: invite.groupId, userId: actor.id, status: "pending" }, select: { id: true } });
      if (pending) return { application: pending, alreadyPending: true as const };
      const application = await tx.chatGroupApplication.create({ data: { groupId: invite.groupId, userId: actor.id, reason: input.data.reason, sourceInviteId: invite.id }, select: { id: true, status: true, submittedAt: true } });
      const admins = await tx.chatGroupMember.findMany({ where: { groupId: invite.groupId, status: "active", role: { in: ["owner", "admin"] } }, select: { userId: true } });
      await notifyChatUsers(tx, [invite.group.ownerId, ...admins.map(({ userId }) => userId)], actor.id, {
        type: "chat_group_application",
        title: `入群申请：${invite.group.name}`,
        content: `${actor.nickname?.trim() || "ENHE 用户"} 提交了入群申请。`,
        linkUrl: `/admin/chat-groups/${invite.groupId}?tab=applications`,
      });
      return { application };
    }, { isolationLevel: "Serializable" });
    return chatJson(result, "alreadyMember" in result ? 200 : 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["CHAT_GROUP_CLOSED", "CHAT_JOIN_PAUSED", "CHAT_GROUP_FULL", "CHAT_MEMBER_BANNED", "CHAT_REJOIN_COOLDOWN"].includes(code)) return chatError(code, 409);
    return chatError("CHAT_APPLICATION_UNAVAILABLE", 500);
  }
}
