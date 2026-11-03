import { z } from "zod";

const unicodeCharacterCount = (value: string) => Array.from(value).length;
const shortText = (max: number) => z.string().trim().refine((value) => unicodeCharacterCount(value) <= max);

export const chatRejoinCooldownMs = 24 * 60 * 60 * 1000;
export const groupChatMessageMaxLength = 2000;
export const groupChatImageMaxCount = 9;
export const groupChatImageMaxBytes = 10 * 1024 * 1024;
export const groupChatMuteDurationsHours = [1, 24, 168] as const;

export function isChatMemberMuted(input: { muted: boolean; mutedUntil: Date | null; now?: Date }) {
  return input.muted && (!input.mutedUntil || input.mutedUntil.getTime() > (input.now ?? new Date()).getTime());
}

export function chatMuteRemainingMs(mutedUntil: Date | string | null, now = Date.now()) {
  if (!mutedUntil) return null;
  const expiry = mutedUntil instanceof Date ? mutedUntil.getTime() : Date.parse(mutedUntil);
  return Number.isFinite(expiry) ? Math.max(0, expiry - now) : null;
}

export function chatMuteExpiry(durationHours: number, now = new Date()) {
  if (!groupChatMuteDurationsHours.includes(durationHours as (typeof groupChatMuteDurationsHours)[number])) return null;
  return new Date(now.getTime() + durationHours * 60 * 60 * 1000);
}

export function unreadChatMessageWhere(lastReadSequence: number) {
  return { status: "active" as const, sequence: { gt: lastReadSequence } };
}

export function eventPageCursor(after: number, events: Array<{ sequence: number }>, pageSize: number) {
  return {
    lastSequence: events.at(-1)?.sequence ?? after,
    hasMore: events.length === pageSize,
  };
}

export function chatMessagePayloadMatches(existing: {
  text: string;
  emojiIds: string[];
  mentionEveryone: boolean;
  replyToMessageId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  mediaIds: string[];
  mentionUserIds: string[];
}, desired: {
  text: string;
  emojiIds: string[];
  mentionEveryone: boolean;
  replyToMessageId?: string | null;
  contentReference?: { type: "tool" | "news"; id: string } | null;
  mediaIds: string[];
  mentionUserIds: string[];
}) {
  const desiredReferenceType = desired.contentReference?.type ?? null;
  const desiredReferenceId = desired.contentReference?.id ?? null;
  const sameMentions = [...existing.mentionUserIds].sort().join("\0") === [...desired.mentionUserIds].sort().join("\0");
  return existing.text === desired.text
    && JSON.stringify(existing.emojiIds) === JSON.stringify(desired.emojiIds)
    && existing.mentionEveryone === desired.mentionEveryone
    && existing.replyToMessageId === (desired.replyToMessageId ?? null)
    && existing.referenceType === desiredReferenceType
    && existing.referenceId === desiredReferenceId
    && JSON.stringify(existing.mediaIds) === JSON.stringify(desired.mediaIds)
    && sameMentions;
}

export function buildChatMessageSearchWhere(input: {
  query: string;
  senderId: string | null;
  kind: "all" | "text" | "image" | "reference";
  referenceIds: string[];
}) {
  const where: Record<string, unknown> = {};
  const activeOnly = Boolean(input.query.trim() || input.senderId || input.kind !== "all");
  if (activeOnly) where.status = "active";
  if (input.senderId) where.senderId = input.senderId;
  if (input.kind === "text") where.text = { not: "" };
  if (input.kind === "image") where.media = { some: { discardedAt: null } };
  if (input.kind === "reference") where.referenceId = { not: null };
  const query = input.query.trim();
  if (query) {
    const alternatives: Record<string, unknown>[] = [{ text: { contains: query, mode: "insensitive" } }];
    if (input.referenceIds.length) alternatives.push({ referenceId: { in: input.referenceIds } });
    where.AND = [...(Array.isArray(where.AND) ? where.AND as Record<string, unknown>[] : []), { OR: alternatives }];
  }
  return where;
}

export function hasChatRejoinCooldown(input: {
  memberStatus: string | null;
  statusChangedAt: Date | null;
  applicationStatus: string | null;
  applicationAt: Date | null;
  now?: Date;
}) {
  if (input.memberStatus === "banned") return false;
  const relevantMemberChange = ["left", "removed"].includes(input.memberStatus ?? "") ? input.statusChangedAt : null;
  const relevantApplicationChange = input.applicationStatus === "rejected" ? input.applicationAt : null;
  const cooldownAt = relevantMemberChange && relevantApplicationChange
    ? new Date(Math.max(relevantMemberChange.getTime(), relevantApplicationChange.getTime()))
    : relevantMemberChange ?? relevantApplicationChange;
  return Boolean(cooldownAt && (input.now ?? new Date()).getTime() - cooldownAt.getTime() < chatRejoinCooldownMs);
}

const textWithinLimit = (value: string) => Array.from(value).length <= groupChatMessageMaxLength;

export const groupCreateInputSchema = z.object({
  name: shortText(30).refine((value) => unicodeCharacterCount(value) >= 2),
  description: shortText(200),
  rules: z.string().trim().max(5000),
  discoverability: z.enum(["listed", "invite_only"]),
  maxMembers: z.number().int().min(2).max(5000),
  allowMemberInvites: z.boolean(),
  pauseJoins: z.boolean(),
  avatarMediaId: z.string().trim().min(1).max(64).optional().nullable(),
});

export const groupApplicationInputSchema = z.object({
  reason: shortText(200).optional().default(""),
  acceptedRules: z.literal(true),
});

export const groupEmojiInputSchema = z.object({
  shortcode: z.string().trim().regex(/^:?[a-z0-9_-]{2,32}:?$/).transform((value) => value.replace(/^:/, "").replace(/:$/, "")),
  emoji: z.string().trim().refine((value) => unicodeCharacterCount(value) >= 1 && unicodeCharacterCount(value) <= 12 && !/[<>\x00-\x1f\x7f]/.test(value)),
  name: shortText(32).refine((value) => unicodeCharacterCount(value) > 0),
  category: shortText(32).refine((value) => unicodeCharacterCount(value) > 0),
  sortOrder: z.number().int().min(-10000).max(10000).default(0),
});

export const groupUpdateInputSchema = z.object({
  name: shortText(30).refine((value) => unicodeCharacterCount(value) >= 2).optional(),
  description: shortText(200).optional(),
  rules: z.string().trim().max(5000).optional(),
  discoverability: z.enum(["listed", "invite_only"]).optional(),
  maxMembers: z.number().int().min(2).max(5000).optional(),
  allowMemberInvites: z.boolean().optional(),
  pauseJoins: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  status: z.enum(["active", "archived", "disabled"]).optional(),
  avatarMediaId: z.string().trim().min(1).max(64).optional().nullable(),
}).refine((value) => Object.keys(value).length > 0);

const groupChatContentReferenceSchema = z.object({
  type: z.enum(["tool", "news"]),
  id: z.string().trim().min(1).max(100),
});

export const groupMessageInputSchema = z.object({
  clientMessageId: z.string().uuid(),
  text: z.string().refine(textWithinLimit, { message: "MESSAGE_TEXT_TOO_LONG" }).optional().default(""),
  emojiIds: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  mediaIds: z.array(z.string().trim().min(1).max(64)).max(groupChatImageMaxCount).default([]),
  mentionUserIds: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
  mentionEveryone: z.boolean().default(false),
  replyToMessageId: z.string().trim().min(1).max(64).optional().nullable(),
  contentReference: groupChatContentReferenceSchema.optional().nullable(),
}).superRefine((message, context) => {
  if (!message.text.trim() && !message.emojiIds.length && !message.mediaIds.length && !message.contentReference) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "MESSAGE_CONTENT_REQUIRED" });
  }
});

export function canManageChatGroup(input: {
  siteRole: "admin" | "user";
  groupRole: "owner" | "admin" | "member" | null;
  isOwner: boolean;
}) {
  return input.siteRole === "admin" || input.isOwner || input.groupRole === "owner" || input.groupRole === "admin";
}

export function canModerateChatMember(actorRole: "site_admin" | "owner" | "admin" | "member", targetRole: "owner" | "admin" | "member") {
  if (actorRole === "site_admin") return true;
  if (actorRole === "owner") return targetRole === "member" || targetRole === "admin";
  if (actorRole === "admin") return targetRole === "member";
  return false;
}

export function isChatGroupAtCapacity(activeMemberCount: number, maxMembers: number) {
  return activeMemberCount >= maxMembers;
}

export function sanitizeGroupChatReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return null;
  }
  if (/%(?:2f|5c|2e)/i.test(value)) return null;
  try {
    const parsed = new URL(value, "https://www.enhe-tech.com.cn");
    if (parsed.origin !== "https://www.enhe-tech.com.cn" || !/^\/chat(?:\/|$)/.test(parsed.pathname)) return null;
    if (decodeURIComponent(parsed.pathname).split("/").some((part) => part === "..")) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
