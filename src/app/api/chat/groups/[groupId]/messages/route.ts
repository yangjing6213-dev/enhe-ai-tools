import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultChatEmojis, groupChatCopy } from "@/lib/group-chat/constants";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";
import { buildChatMessageSearchWhere, chatMessagePayloadMatches, groupMessageInputSchema, isChatMemberMuted } from "@/lib/group-chat/policy";
import { findChatMembership, nextGroupSequence, notifyChatUsers, resolvePublicReference } from "@/lib/group-chat/service";
import { chatMessageInclude, serializeChatMessages } from "@/lib/group-chat/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };
type MessageInput = {
  clientMessageId: string;
  text: string;
  emojiIds: string[];
  mediaIds: string[];
  mentionUserIds: string[];
  mentionEveryone: boolean;
  replyToMessageId?: string | null;
  contentReference?: { type: "tool" | "news"; id: string } | null;
};
type ChatMessageReader = Pick<Prisma.TransactionClient, "chatGroupMessage" | "chatGroupMessageMention">;

async function findIdempotentMessage(client: ChatMessageReader, groupId: string, senderId: string, input: MessageInput) {
  const existing = await client.chatGroupMessage.findUnique({
    where: { groupId_senderId_clientMessageId: { groupId, senderId, clientMessageId: input.clientMessageId } },
    include: { media: { select: { id: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!existing) return null;
  const existingMentions = await client.chatGroupMessageMention.findMany({ where: { messageId: existing.id }, select: { userId: true } });
  if (!chatMessagePayloadMatches({
    text: existing.text,
    emojiIds: existing.emojiIds,
    mentionEveryone: existing.mentionEveryone,
    replyToMessageId: existing.replyToMessageId,
    referenceType: existing.referenceType,
    referenceId: existing.referenceId,
    mediaIds: existing.media.map(({ id }) => id),
    mentionUserIds: existingMentions.map(({ userId }) => userId),
  }, input)) throw new Error("CHAT_MESSAGE_ID_CONFLICT");
  return { id: existing.id, sequence: existing.sequence, createdAt: existing.createdAt, duplicate: true as const };
}
export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  const member = await findChatMembership(groupId, actor.id);
  if (!member) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  const url = new URL(request.url);
  const before = Number(url.searchParams.get("before"));
  const after = Number(url.searchParams.get("after"));
  const query = url.searchParams.get("q")?.trim() ?? "";
  const requestedKind = url.searchParams.get("kind") ?? "all";
  const kind = ["all", "text", "image", "reference"].includes(requestedKind) ? requestedKind as "all" | "text" | "image" | "reference" : "all";
  const rawSenderId = url.searchParams.get("senderId");
  const senderId = rawSenderId && /^[A-Za-z0-9_-]{1,80}$/.test(rawSenderId) ? rawSenderId : null;
  if (query && !(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "search", limit: groupChatCopy.searchLimitPerMinute, windowMs: 60_000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  const referenceIds = query ? await Promise.all([
    prisma.tool.findMany({ where: { status: "published", OR: [{ name: { contains: query, mode: "insensitive" } }, { englishName: { contains: query, mode: "insensitive" } }, { shortDescription: { contains: query, mode: "insensitive" } }] }, select: { id: true }, take: 50 }),
    prisma.newsArticle.findMany({ where: { status: "published", OR: [{ title: { contains: query, mode: "insensitive" } }, { englishTitle: { contains: query, mode: "insensitive" } }, { summary: { contains: query, mode: "insensitive" } }] }, select: { id: true }, take: 50 }),
  ]).then(([tools, articles]) => [...tools, ...articles].map(({ id }) => id)) : [];
  const where: Prisma.ChatGroupMessageWhereInput = {
    groupId,
    ...buildChatMessageSearchWhere({ query, senderId, kind, referenceIds }),
    ...(Number.isSafeInteger(before) && before > 0 ? { sequence: { lt: before } } : {}),
    ...(Number.isSafeInteger(after) && after > 0 ? { sequence: { gt: after } } : {}),
  };
  const [rows, group] = await Promise.all([
    prisma.chatGroupMessage.findMany({ where, include: chatMessageInclude, orderBy: { sequence: after ? "asc" : "desc" }, take: after ? 100 : 50 }),
    prisma.chatGroup.findUnique({ where: { id: groupId }, select: { lastSequence: true } }),
  ]);
  const ordered = after ? rows : rows.reverse();
  const messages = await serializeChatMessages(ordered);
  return chatJson({ messages, lastSequence: group?.lastSequence ?? 0, hasMore: rows.length === (after ? 100 : 50), currentUserId: actor.id });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  const member = await findChatMembership(groupId, actor.id);
  if (!member) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  if (member.group.readOnly) return chatError("CHAT_GROUP_READ_ONLY", 409);
  if (member.muted) return chatError("CHAT_MEMBER_MUTED", 403);
  if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "message", limit: groupChatCopy.messageLimitPerMinute, windowMs: 60_000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  let body: unknown;
  try { body = await readChatJson(request); } catch (error) { return chatError(error instanceof Error && error.message === "CHAT_BODY_TOO_LARGE" ? "CHAT_BODY_TOO_LARGE" : "CHAT_INVALID_JSON", 400); }
  const parsed = groupMessageInputSchema.safeParse(body);
  if (!parsed.success) return chatError("CHAT_MESSAGE_INVALID", 400, { issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) });
  const input = parsed.data;
  try {
    const duplicate = await findIdempotentMessage(prisma, groupId, actor.id, input);
    if (duplicate) return chatJson(duplicate, 200);
  } catch (error) {
    if (error instanceof Error && error.message === "CHAT_MESSAGE_ID_CONFLICT") return chatError("CHAT_MESSAGE_ID_CONFLICT", 409);
    throw error;
  }
  if (input.mentionEveryone && !(member.role === "owner" || member.role === "admin" || actor.role === "admin")) return chatError("CHAT_MENTION_ALL_MANAGER_ONLY", 403);
  if (input.mentionEveryone && !input.text.includes("@所有人")) return chatError("CHAT_MENTION_ALL_TEXT_REQUIRED", 400);
  if (input.mentionEveryone && !(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "mention_all", limit: 3, windowMs: 60 * 60 * 1000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  if (new Set(input.mediaIds).size !== input.mediaIds.length || new Set(input.emojiIds).size !== input.emojiIds.length || new Set(input.mentionUserIds).size !== input.mentionUserIds.length) return chatError("CHAT_MESSAGE_INVALID", 400);
  const baseEmojiIds = new Set(defaultChatEmojis.map((emoji) => emoji.id));
  const activeEmojis = input.emojiIds.length ? await prisma.chatGroupEmoji.findMany({ where: { id: { in: input.emojiIds }, active: true }, select: { id: true } }) : [];
  const validEmojiIds = new Set([...baseEmojiIds, ...activeEmojis.map(({ id }) => id)]);
  if (input.emojiIds.some((id) => !validEmojiIds.has(id))) return chatError("CHAT_EMOJI_UNAVAILABLE", 400);
  if (input.mentionUserIds.length) {
    const mentioned = await prisma.chatGroupMember.count({ where: { groupId, userId: { in: input.mentionUserIds }, status: "active" } });
    if (mentioned !== input.mentionUserIds.length || input.mentionUserIds.includes(actor.id)) return chatError("CHAT_MENTION_MEMBER_INVALID", 400);
  }
  const media = input.mediaIds.length ? await prisma.chatGroupMedia.findMany({ where: { id: { in: input.mediaIds }, groupId, userId: actor.id, purpose: "message", messageId: null, discardedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }) : [];
  if (media.length !== input.mediaIds.length) return chatError("CHAT_MEDIA_UNAVAILABLE", 409);
  if (input.contentReference && !(await resolvePublicReference(input.contentReference, prisma))) return chatError("CHAT_REFERENCE_UNAVAILABLE", 409);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentMember = await tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, include: { group: { select: { status: true, readOnly: true } } } });
      if (!currentMember || currentMember.status !== "active" || currentMember.group.status !== "active") throw new Error("CHAT_GROUP_MEMBER_REQUIRED");
      if (isChatMemberMuted({ muted: currentMember.muted, mutedUntil: currentMember.mutedUntil })) throw new Error("CHAT_MEMBER_MUTED");
      if (currentMember.group.readOnly) throw new Error("CHAT_GROUP_READ_ONLY");
      const existing = await findIdempotentMessage(tx, groupId, actor.id, input);
      if (existing) return existing;
      if (input.mentionUserIds.length) {
        const mentionedCount = await tx.chatGroupMember.count({ where: { groupId, userId: { in: input.mentionUserIds }, status: "active" } });
        if (mentionedCount !== input.mentionUserIds.length) throw new Error("CHAT_MENTION_MEMBER_INVALID");
      }
      const replyTarget = input.replyToMessageId
        ? await tx.chatGroupMessage.findFirst({ where: { id: input.replyToMessageId, groupId, status: "active" }, select: { senderId: true } })
        : null;
      if (input.replyToMessageId && !replyTarget) throw new Error("CHAT_REPLY_UNAVAILABLE");
      if (input.contentReference && !(await resolvePublicReference(input.contentReference, tx))) throw new Error("CHAT_REFERENCE_UNAVAILABLE");
      const sequence = await nextGroupSequence(tx, groupId);
      const message = await tx.chatGroupMessage.create({
        data: {
          groupId,
          senderId: actor.id,
          clientMessageId: input.clientMessageId,
          sequence,
          text: input.text,
          emojiIds: input.emojiIds,
          mentionEveryone: input.mentionEveryone,
          replyToMessageId: input.replyToMessageId ?? null,
          referenceType: input.contentReference?.type ?? null,
          referenceId: input.contentReference?.id ?? null,
          ...(input.mentionUserIds.length ? { mentions: { create: input.mentionUserIds.map((userId) => ({ userId })) } } : {}),
        },
        select: { id: true, sequence: true, createdAt: true },
      });
      if (input.mediaIds.length) {
        const attached = await tx.chatGroupMedia.updateMany({ where: { id: { in: input.mediaIds }, groupId, userId: actor.id, purpose: "message", messageId: null, discardedAt: null, expiresAt: { gt: new Date() } }, data: { messageId: message.id, expiresAt: new Date("9999-12-31T23:59:59.999Z") } });
        if (attached.count !== input.mediaIds.length) throw new Error("CHAT_MEDIA_UNAVAILABLE");
      }
      await tx.chatGroupEvent.create({ data: { groupId, sequence, kind: "message", messageId: message.id, payload: { messageId: message.id } } });
      if (replyTarget) {
        await notifyChatUsers(tx, [replyTarget.senderId], actor.id, { type: "chat_group_reply", title: "有人回复了你的群聊消息", content: input.text.slice(0, 160) || "有人回复了你的消息。", linkUrl: `/chat/${groupId}?message=${message.id}` });
      }
      if (input.mentionUserIds.length) {
        await notifyChatUsers(tx, input.mentionUserIds.filter((userId) => userId !== replyTarget?.senderId), actor.id, { type: "chat_group_mention", title: `有人在群聊中提到了你`, content: input.text.slice(0, 160), linkUrl: `/chat/${groupId}?message=${message.id}` });
      }
      if (input.mentionEveryone) {
        const recipients = await tx.chatGroupMember.findMany({ where: { groupId, status: "active", userId: { not: actor.id }, OR: [{ muted: false }, { mutedUntil: { lte: new Date() } }] }, select: { userId: true } });
        await notifyChatUsers(tx, recipients.map(({ userId }) => userId).filter((userId) => userId !== replyTarget?.senderId), actor.id, { type: "chat_group_mention_all", title: `群聊提醒：${member.group.name}`, content: input.text.slice(0, 160), linkUrl: `/chat/${groupId}?message=${message.id}` });
      }
      return { ...message, duplicate: false };
    }, { isolationLevel: "Serializable" });
    return chatJson(result, result.duplicate ? 200 : 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      try {
        const duplicate = await findIdempotentMessage(prisma, groupId, actor.id, input);
        if (duplicate) return chatJson(duplicate, 200);
        return chatError("CHAT_MESSAGE_RETRY", 409);
      } catch (retryError) {
        if (retryError instanceof Error && retryError.message === "CHAT_MESSAGE_ID_CONFLICT") return chatError("CHAT_MESSAGE_ID_CONFLICT", 409);
        return chatError("CHAT_MESSAGE_RETRY", 409);
      }
    }
    const status = code === "CHAT_MESSAGE_ID_CONFLICT" ? 409 : code === "CHAT_GROUP_MEMBER_REQUIRED" ? 403 : ["CHAT_MEMBER_MUTED", "CHAT_GROUP_READ_ONLY", "CHAT_MEDIA_UNAVAILABLE", "CHAT_REPLY_UNAVAILABLE"].includes(code) ? 409 : 500;
    return chatError(code.startsWith("CHAT_") ? code : "CHAT_MESSAGE_UNAVAILABLE", status);
  }
}
