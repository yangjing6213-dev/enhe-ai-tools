import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupApplicationInputSchema } from "@/lib/group-chat/policy";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";
import { notifyChatUsers } from "@/lib/group-chat/service";
import { hashChatInviteToken, verifyChatInviteToken } from "@/lib/group-chat/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  const membership = await prisma.chatGroupMember.findFirst({ where: { groupId, userId: actor.id, status: "active" }, select: { role: true } });
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, select: { ownerId: true } });
  const isManager = actor.role === "admin" || group?.ownerId === actor.id || membership?.role === "owner" || membership?.role === "admin";
  if (!isManager) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  const applications = await prisma.chatGroupApplication.findMany({
    where: { groupId, status: "pending" },
    select: { id: true, reason: true, submittedAt: true, sourceInviteId: true, user: { select: { id: true, nickname: true, avatar: true, role: true } } },
    orderBy: { submittedAt: "asc" },
    take: 100,
  });
  const applicantIds = applications.map((application) => application.user.id);
  const [history, members] = applicantIds.length ? await Promise.all([
    prisma.chatGroupApplication.findMany({
      where: { groupId, userId: { in: applicantIds } },
      select: { userId: true, status: true, submittedAt: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.chatGroupMember.findMany({ where: { groupId, userId: { in: applicantIds } }, select: { userId: true, status: true } }),
  ]) : [[], []];
  const applicationHistory = new Map<string, Date[]>();
  for (const item of history) applicationHistory.set(item.userId, [...(applicationHistory.get(item.userId) ?? []), item.submittedAt]);
  const memberStatuses = new Map(members.map(({ userId, status }) => [userId, status]));
  return chatJson({ applications: applications.map(({ user, ...application }) => ({
    ...application,
    applicant: { id: user.id, nickname: user.nickname?.trim() || "ENHE 用户", avatar: user.avatar, role: user.role === "admin" ? "网站管理员" : "成员" },
    history: { priorApplications: (applicationHistory.get(user.id) ?? []).filter((submittedAt) => submittedAt < application.submittedAt).length, previousMemberStatus: memberStatuses.get(user.id) ?? null },
  })) });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "apply", limit: 5, windowMs: 60 * 60 * 1000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  let body: Record<string, unknown>;
  try { body = (await readChatJson(request)) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const parsed = groupApplicationInputSchema.safeParse(body);
  if (!parsed.success) return chatError("CHAT_APPLICATION_INVALID", 400);

  const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, select: { id: true, ownerId: true, name: true, visibility: true, status: true, pauseJoins: true, activeMemberCount: true, maxMembers: true } });
  if (!group || group.status !== "active") return chatError("CHAT_GROUP_UNAVAILABLE", 404);
  if (group.pauseJoins) return chatError("CHAT_JOIN_PAUSED", 409);
  if (group.activeMemberCount >= group.maxMembers) return chatError("CHAT_GROUP_FULL", 409);

  const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken : null;
  let sourceInviteId: string | null = null;
  if (group.visibility === "invite_only" || inviteToken) {
    if (!inviteToken) return chatError("CHAT_INVITE_REQUIRED", 403);
    const invite = await prisma.chatGroupInvite.findFirst({ where: { groupId, tokenHash: hashChatInviteToken(inviteToken) }, select: { id: true, tokenHash: true, pausedAt: true, expiresAt: true } });
    if (!invite || !verifyChatInviteToken(inviteToken, invite.tokenHash) || invite.pausedAt || (invite.expiresAt && invite.expiresAt <= new Date())) return chatError("CHAT_INVITE_UNAVAILABLE", 410);
    sourceInviteId = invite.id;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [member, previous, pending] = await Promise.all([
        tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } } }),
        tx.chatGroupApplication.findFirst({ where: { groupId, userId: actor.id, status: "rejected" }, orderBy: { reviewedAt: "desc" }, select: { reviewedAt: true } }),
        tx.chatGroupApplication.findFirst({ where: { groupId, userId: actor.id, status: "pending" }, select: { id: true } }),
      ]);
      if (member?.status === "active") return { alreadyMember: true as const };
      if (member?.status === "banned") throw new Error("CHAT_MEMBER_BANNED");
      const lastChange = member?.status === "left" || member?.status === "removed" ? member.statusChangedAt : null;
      const lastRejection = previous?.reviewedAt;
      const cooldownAt = lastChange && lastRejection ? new Date(Math.max(lastChange.getTime(), lastRejection.getTime())) : lastChange ?? lastRejection;
      if (cooldownAt && Date.now() - cooldownAt.getTime() < 24 * 60 * 60 * 1000) throw new Error("CHAT_REJOIN_COOLDOWN");
      if (pending) return { application: pending, alreadyPending: true as const };
      const application = await tx.chatGroupApplication.create({ data: { groupId, userId: actor.id, reason: parsed.data.reason, sourceInviteId }, select: { id: true, status: true, submittedAt: true } });
      const managers = await tx.chatGroupMember.findMany({ where: { groupId, status: "active", role: { in: ["owner", "admin"] } }, select: { userId: true } });
      await notifyChatUsers(tx, [group.ownerId, ...managers.map(({ userId }) => userId)], actor.id, {
        type: "chat_group_application",
        title: `入群申请：${group.name}`,
        content: `${actor.nickname?.trim() || "ENHE 用户"} 提交了入群申请。`,
        linkUrl: `/admin/chat-groups/${groupId}?tab=applications`,
      });
      return { application };
    }, { isolationLevel: "Serializable" });
    return chatJson(result, "alreadyMember" in result ? 200 : 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["CHAT_MEMBER_BANNED", "CHAT_REJOIN_COOLDOWN"].includes(code)) return chatError(code, 409);
    if (code === "P2002") return chatError("CHAT_APPLICATION_PENDING", 409);
    return chatError("CHAT_APPLICATION_UNAVAILABLE", 500);
  }
}
