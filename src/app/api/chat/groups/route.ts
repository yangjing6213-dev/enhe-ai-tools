import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupCreateInputSchema, unreadChatMessageWhere } from "@/lib/group-chat/policy";
import { isChatMemberMuted } from "@/lib/group-chat/policy";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";
import { makeInviteRecord } from "@/lib/group-chat/service";
import { groupChatSiteOrigin } from "@/lib/group-chat/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "mine";

  if (mode === "discover") {
    const rows = await prisma.chatGroup.findMany({
      where: { status: "active", visibility: "listed" },
      select: {
        id: true, name: true, description: true, rules: true, avatarMediaId: true,
        activeMemberCount: true, maxMembers: true, pauseJoins: true, readOnly: true, status: true,
        members: { where: { userId: actor.id }, select: { status: true }, take: 1 },
        applications: { where: { userId: actor.id, status: "pending" }, select: { id: true }, take: 1 },
      },
      orderBy: [{ activeMemberCount: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    return chatJson({ groups: rows.map(({ members, applications, ...group }) => ({ ...group, membershipStatus: members[0]?.status ?? null, applicationPending: applications.length > 0 })) });
  }

  if (mode === "applications") {
    const applications = await prisma.chatGroupApplication.findMany({
      where: { userId: actor.id },
      select: { id: true, groupId: true, status: true, reason: true, rejectionReason: true, submittedAt: true, reviewedAt: true, group: { select: { id: true, name: true, avatarMediaId: true, status: true } } },
      orderBy: { submittedAt: "desc" },
      take: 100,
    });
    return chatJson({ applications });
  }

  if (mode === "admin") {
    if (actor.role !== "admin") return chatError("CHAT_ADMIN_REQUIRED", 403);
    const groups = await prisma.chatGroup.findMany({
      select: { id: true, name: true, description: true, visibility: true, status: true, pauseJoins: true, readOnly: true, activeMemberCount: true, maxMembers: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return chatJson({ groups });
  }

  const memberships = await prisma.chatGroupMember.findMany({
    where: { userId: actor.id, status: "active", group: { status: { in: ["active", "archived"] } } },
    select: {
      role: true, muted: true, mutedUntil: true, lastReadSequence: true,
      group: {
        select: {
          id: true, name: true, description: true, avatarMediaId: true,
          activeMemberCount: true, lastSequence: true, readOnly: true, status: true,
          messages: { where: { status: "active" }, orderBy: { sequence: "desc" }, take: 1, select: { text: true, sender: { select: { nickname: true } }, createdAt: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  const groups = await Promise.all(memberships.map(async ({ group, role, muted, mutedUntil, lastReadSequence }) => ({
    ...group,
    readOnly: group.readOnly || group.status !== "active",
    role,
    muted: isChatMemberMuted({ muted, mutedUntil }),
    unreadCount: await prisma.chatGroupMessage.count({ where: { groupId: group.id, ...unreadChatMessageWhere(lastReadSequence) } }),
    lastMessage: group.messages[0] ? {
      text: group.messages[0].text.slice(0, 120),
      sender: group.messages[0].sender.nickname?.trim() || "ENHE 用户",
      createdAt: group.messages[0].createdAt,
    } : null,
  })));
  return chatJson({ groups });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (actor.role !== "admin") return chatError("CHAT_ADMIN_REQUIRED", 403);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  if (!(await consumeChatRateLimit({ actorKey: actor.id, action: "create_group", limit: 5, windowMs: 60 * 60 * 1000 }))) return chatError("CHAT_RATE_LIMIT", 429);

  try {
    const parsed = groupCreateInputSchema.safeParse(await readChatJson(request));
    if (!parsed.success) return chatError("CHAT_GROUP_INPUT_INVALID", 400, { issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) });
    const data = parsed.data;
    const invite = makeInviteRecord("pending");
    const group = await prisma.$transaction(async (tx) => tx.chatGroup.create({
      data: {
        ownerId: actor.id,
        name: data.name,
        description: data.description,
        rules: data.rules,
        visibility: data.discoverability,
        allowMemberInvites: data.allowMemberInvites,
        pauseJoins: data.pauseJoins,
        maxMembers: data.maxMembers,
        activeMemberCount: 1,
        members: { create: { userId: actor.id, role: "owner", status: "active" } },
        invite: { create: { tokenHash: invite.record.tokenHash, tokenCiphertext: invite.record.tokenCiphertext, resetAt: invite.record.resetAt } },
      },
      select: { id: true, name: true, activeMemberCount: true, maxMembers: true },
    }));
    const link = new URL(`/chat/invite/${invite.token}`, groupChatSiteOrigin()).toString();
    return chatJson({ group, invite: { token: invite.token, link } }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return chatError(message === "CHAT_SECRET_INVALID" ? "CHAT_SECRET_UNAVAILABLE" : "CHAT_UNAVAILABLE", 500);
  }
}
