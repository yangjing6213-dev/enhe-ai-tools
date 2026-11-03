import type { Prisma } from "@prisma/client";
import { defaultChatEmojis } from "@/lib/group-chat/constants";
import { prisma } from "@/lib/db";
import { publicChatProfile, resolvePublicReference } from "@/lib/group-chat/service";

export const chatMessageInclude = {
  sender: { select: { id: true, nickname: true, avatar: true, role: true } },
  media: { where: { discardedAt: null }, select: { id: true, width: true, height: true, originalName: true }, orderBy: { createdAt: "asc" } },
  mentions: { select: { userId: true } },
  replyTo: { select: { id: true, status: true, text: true, sender: { select: { nickname: true } } } },
} satisfies Prisma.ChatGroupMessageInclude;

export type IncludedChatMessage = Prisma.ChatGroupMessageGetPayload<{ include: typeof chatMessageInclude }>;

export const chatAnnouncementInclude = {
  createdBy: { select: { nickname: true, avatar: true } },
  updatedBy: { select: { nickname: true, avatar: true } },
  media: { select: { id: true, width: true, height: true } },
} satisfies Prisma.ChatGroupAnnouncementInclude;
export type IncludedChatAnnouncement = Prisma.ChatGroupAnnouncementGetPayload<{ include: typeof chatAnnouncementInclude }>;

export async function serializeChatAnnouncements(announcements: IncludedChatAnnouncement[]) {
  return Promise.all(announcements.map(async (item) => {
    const validReferenceType = item.referenceType === "tool" || item.referenceType === "news" ? item.referenceType : null;
    const reference = validReferenceType && item.referenceId
      ? await resolvePublicReference({ type: validReferenceType, id: item.referenceId }, prisma)
      : null;
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      pinned: item.pinned,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      author: { nickname: item.createdBy.nickname?.trim() || "ENHE 用户", avatar: item.createdBy.avatar },
      updatedBy: { nickname: item.updatedBy.nickname?.trim() || "ENHE 用户", avatar: item.updatedBy.avatar },
      media: item.media ? { id: item.media.id, width: item.media.width, height: item.media.height, url: `/api/chat/media/${encodeURIComponent(item.media.id)}` } : null,
      reference: reference ?? (item.referenceId ? { unavailable: true as const } : null),
    };
  }));
}

export async function serializeChatMessages(messages: IncludedChatMessage[]) {
  const activeEmojiIds = new Set<string>(defaultChatEmojis.map((emoji) => emoji.id));
  const customEmojiIds = new Set((await prisma.chatGroupEmoji.findMany({ select: { id: true } })).map(({ id }) => id));
  return Promise.all(messages.map(async (message) => {
    const available = message.status === "active";
    const reference = available && message.referenceType && message.referenceId
      ? await resolvePublicReference({ type: message.referenceType as "tool" | "news", id: message.referenceId }, prisma)
      : null;
    return {
      id: message.id,
      clientMessageId: message.clientMessageId,
      sequence: message.sequence,
      createdAt: message.createdAt,
      sender: publicChatProfile(message.sender),
      status: message.status,
      pinnedAt: message.status === "active" ? message.pinnedAt?.toISOString() ?? null : null,
      text: available ? message.text : message.status === "retracted" ? "消息已撤回" : "消息已移除",
      emojiIds: available ? message.emojiIds.filter((id) => activeEmojiIds.has(id) || customEmojiIds.has(id) || /^u[\da-f-]{1,32}$/i.test(id)) : [],
      media: available ? message.media.map(({ id, width, height }) => ({ id, width, height, url: `/api/chat/media/${encodeURIComponent(id)}`, thumbnailUrl: `/api/chat/media/${encodeURIComponent(id)}?variant=thumbnail` })) : [],
      mentions: available ? message.mentions.map(({ userId }) => userId) : [],
      mentionEveryone: available && message.mentionEveryone,
      reference: available ? reference ?? (message.referenceId ? { unavailable: true as const } : null) : null,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        text: message.replyTo.status === "active" ? message.replyTo.text.slice(0, 180) : "消息已不可用",
        sender: message.replyTo.sender.nickname?.trim() || "ENHE 用户",
        unavailable: message.replyTo.status !== "active",
      } : null,
      groupId: message.groupId,
    };
  }));
}
