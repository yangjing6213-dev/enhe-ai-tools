import { createChatInviteToken, encryptChatInviteToken, hashChatInviteToken } from "@/lib/group-chat/security";
import { prisma } from "@/lib/db";
import { buildCanonicalAiNewsPath, buildCanonicalToolPath } from "@/lib/public-slugs";
import { isChatMemberMuted } from "@/lib/group-chat/policy";
import type { Prisma } from "@prisma/client";

export type ChatActor = { id: string; role: string; status?: string };
type Tx = Prisma.TransactionClient;

export const chatProfileSelect = { id: true, nickname: true, avatar: true, role: true } as const;

export function publicChatProfile(user: { id: string; nickname: string | null; avatar: string | null; role: string }) {
  return { id: user.id, nickname: user.nickname?.trim() || "ENHE 用户", avatar: user.avatar, role: user.role === "admin" ? "网站管理员" : "成员" };
}

export async function findChatMembership(groupId: string, userId: string) {
  const member = await prisma.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, include: { group: true } });
  if (member?.status !== "active" || member.group.status === "disabled") return null;
  return { ...member, muted: isChatMemberMuted({ muted: member.muted, mutedUntil: member.mutedUntil }) };
}

export async function getChatManagerScope(groupId: string, actor: ChatActor) {
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, include: { members: { where: { userId: actor.id }, take: 1 } } });
  if (!group) return null;
  const member = group.members[0];
  const isSiteAdmin = actor.role === "admin";
  const isOwner = group.ownerId === actor.id || member?.role === "owner";
  const isGroupAdmin = member?.status === "active" && member.role === "admin";
  if (!isSiteAdmin && !isOwner && !isGroupAdmin) return null;
  return { group, member, isSiteAdmin, isOwner, isGroupAdmin };
}

export async function nextGroupSequence(tx: Tx, groupId: string) {
  const group = await tx.chatGroup.update({ where: { id: groupId }, data: { lastSequence: { increment: 1 } }, select: { lastSequence: true } });
  return group.lastSequence;
}

export async function recordGroupEvent(tx: Tx, groupId: string, kind: string, payload: Prisma.InputJsonValue, messageId?: string | null) {
  const sequence = await nextGroupSequence(tx, groupId);
  await tx.chatGroupEvent.create({ data: { groupId, sequence, kind, payload, messageId: messageId ?? null } });
  return sequence;
}

export function makeInviteRecord(groupId: string, now = new Date()) {
  const token = createChatInviteToken();
  return {
    token,
    record: { groupId, tokenHash: hashChatInviteToken(token), tokenCiphertext: encryptChatInviteToken(token), resetAt: now },
  };
}

export async function resolvePublicReference(reference: { type: "tool" | "news"; id: string }, tx: Pick<Tx, "tool" | "newsArticle">) {
  if (reference.type === "tool") {
    const item = await tx.tool.findFirst({
      where: { id: reference.id, status: "published" },
      select: { id: true, name: true, englishName: true, slug: true, type: true, shortDescription: true, coverImage: true },
    });
    if (!item) return null;
    return {
      type: "tool" as const,
      id: item.id,
      title: item.name,
      subtitle: item.englishName,
      description: item.shortDescription,
      image: item.coverImage,
      href: buildCanonicalToolPath(item, "zh"),
    };
  }

  const item = await tx.newsArticle.findFirst({
    where: { id: reference.id, status: "published" },
    select: { id: true, title: true, englishTitle: true, slug: true, summary: true, coverImage: true, publishedAt: true, sourceChannel: true },
  });
  if (!item) return null;
  return {
    type: "news" as const,
    id: item.id,
    title: item.title,
    subtitle: item.englishTitle,
    description: item.summary,
    image: item.coverImage,
    publishedAt: item.publishedAt,
    source: item.sourceChannel,
    href: buildCanonicalAiNewsPath(item, "zh"),
  };
}

export async function notifyChatUsers(tx: Tx, userIds: string[], senderId: string, input: { type: string; title: string; content: string; linkUrl: string }) {
  const uniqueIds = [...new Set(userIds)].filter((id) => id !== senderId);
  if (!uniqueIds.length) return;
  await tx.notification.createMany({
    data: uniqueIds.map((userId) => ({ userId, senderId, type: input.type, title: input.title, content: input.content, linkUrl: input.linkUrl })),
    skipDuplicates: true,
  });
}
