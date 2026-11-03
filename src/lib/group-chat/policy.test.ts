import { describe, expect, it } from "vitest";
import {
  chatRejoinCooldownMs,
  canManageChatGroup,
  canModerateChatMember,
  chatMuteExpiry,
  chatMuteRemainingMs,
  hasChatRejoinCooldown,
  unreadChatMessageWhere,
  eventPageCursor,
  buildChatMessageSearchWhere,
  chatMessagePayloadMatches,
  groupApplicationInputSchema,
  groupCreateInputSchema,
  groupMessageInputSchema,
  groupEmojiInputSchema,
  isChatGroupAtCapacity,
  isChatMemberMuted,
  sanitizeGroupChatReturnPath,
} from "@/lib/group-chat/policy";

describe("group chat access and input policy", () => {
  it("counts unread messages rather than non-message synchronization events", () => {
    expect(unreadChatMessageWhere(8)).toEqual({ status: "active", sequence: { gt: 8 } });
  });
  it("advances event synchronization only through the last event returned on this page", () => {
    expect(eventPageCursor(10, [{ sequence: 11 }, { sequence: 12 }], 2)).toEqual({ lastSequence: 12, hasMore: true });
    expect(eventPageCursor(12, [], 2)).toEqual({ lastSequence: 12, hasMore: false });
  });
  it("accepts exact idempotent retries and rejects changed content under the same client id", () => {
    const existing = {
      text: "请看这个工作流",
      emojiIds: ["spark"],
      mentionEveryone: false,
      replyToMessageId: "message-1",
      referenceType: "tool",
      referenceId: "tool-1",
      mediaIds: ["media-1", "media-2"],
      mentionUserIds: ["user-2", "user-3"],
    };
    const desired = {
      text: existing.text,
      emojiIds: existing.emojiIds,
      mentionEveryone: existing.mentionEveryone,
      replyToMessageId: existing.replyToMessageId,
      contentReference: { type: "tool" as const, id: "tool-1" },
      mediaIds: existing.mediaIds,
      mentionUserIds: ["user-3", "user-2"],
    };
    expect(chatMessagePayloadMatches(existing, desired)).toBe(true);
    expect(chatMessagePayloadMatches(existing, { ...desired, mediaIds: ["media-2", "media-1"] })).toBe(false);
    expect(chatMessagePayloadMatches(existing, { ...desired, text: "改过的内容" })).toBe(false);
  });
  it("combines message search filters without allowing an empty public search scope", () => {
    expect(buildChatMessageSearchWhere({ query: "prompt", senderId: "user-1", kind: "reference", referenceIds: ["tool-1"] })).toEqual({
      status: "active",
      senderId: "user-1",
      referenceId: { not: null },
      AND: [{ OR: [{ text: { contains: "prompt", mode: "insensitive" } }, { referenceId: { in: ["tool-1"] } }] }],
    });
    expect(buildChatMessageSearchWhere({ query: "", senderId: null, kind: "image", referenceIds: [] })).toEqual({ status: "active", media: { some: { discardedAt: null } } });
    expect(buildChatMessageSearchWhere({ query: "", senderId: null, kind: "all", referenceIds: [] })).toEqual({});
  });
  it("validates group fields by character count and requires an owner-safe description", () => {
    expect(groupCreateInputSchema.safeParse({
      name: "AI搭子群聊",
      description: "让成员交流可复用的 AI 工作方式。",
      rules: "尊重成员，不发送广告。",
      discoverability: "listed",
      maxMembers: 100,
      allowMemberInvites: true,
      pauseJoins: false,
    }).success).toBe(true);
    expect(groupCreateInputSchema.safeParse({
      name: "群",
      description: "群聊",
      rules: "",
      discoverability: "listed",
      maxMembers: 100,
      allowMemberInvites: true,
      pauseJoins: false,
    }).success).toBe(false);
    expect(groupCreateInputSchema.safeParse({
      name: "群".repeat(31),
      description: "",
      rules: "",
      discoverability: "listed",
      maxMembers: 100,
      allowMemberInvites: true,
      pauseJoins: false,
    }).success).toBe(false);
  });

  it("requires explicit rules acceptance and bounds application reasons", () => {
    expect(groupApplicationInputSchema.safeParse({ reason: "想交流AI工作流", acceptedRules: true }).success).toBe(true);
    expect(groupApplicationInputSchema.safeParse({ reason: "", acceptedRules: false }).success).toBe(false);
    expect(groupApplicationInputSchema.safeParse({ reason: "想法".repeat(101), acceptedRules: true }).success).toBe(false);
  });

  it("accepts at most 2,000 text characters, nine images, one valid reference, and nonempty content", () => {
    const valid = { clientMessageId: "f654ef0b-1e3d-41c8-9633-44556485bdb6", text: "你好", emojiIds: [], mediaIds: [] };
    expect(groupMessageInputSchema.safeParse(valid).success).toBe(true);
    expect(groupMessageInputSchema.safeParse({ ...valid, text: "字".repeat(2001) }).success).toBe(false);
    expect(groupMessageInputSchema.safeParse({ ...valid, text: "😀".repeat(2000) }).success).toBe(true);
    expect(groupMessageInputSchema.safeParse({ ...valid, text: "😀".repeat(2001) }).success).toBe(false);
    expect(groupMessageInputSchema.safeParse({ ...valid, text: "", mediaIds: Array.from({ length: 10 }, (_, index) => `media-${index}`) }).success).toBe(false);
    expect(groupMessageInputSchema.safeParse({ ...valid, text: "", emojiIds: [], mediaIds: [] }).success).toBe(false);
  });

  it("enforces scope and hierarchy for group administrators", () => {
    expect(canManageChatGroup({ siteRole: "user", groupRole: "admin", isOwner: false })).toBe(true);
    expect(canManageChatGroup({ siteRole: "user", groupRole: null, isOwner: false })).toBe(false);
    expect(canModerateChatMember("admin", "member")).toBe(true);
    expect(canModerateChatMember("admin", "admin")).toBe(false);
    expect(canModerateChatMember("admin", "owner")).toBe(false);
    expect(canModerateChatMember("site_admin", "admin")).toBe(true);
  });

  it("keeps pending applicants out of capacity and uses a 24-hour rejoin cooldown", () => {
    expect(isChatGroupAtCapacity(10, 10)).toBe(true);
    expect(isChatGroupAtCapacity(9, 10)).toBe(false);
    expect(chatRejoinCooldownMs).toBe(24 * 60 * 60 * 1000);
    const now = new Date("2026-11-03T12:00:00.000Z");
    const recent = new Date("2026-11-03T00:00:00.000Z");
    expect(hasChatRejoinCooldown({ memberStatus: null, statusChangedAt: null, applicationStatus: "rejected", applicationAt: recent, now })).toBe(true);
    expect(hasChatRejoinCooldown({ memberStatus: null, statusChangedAt: null, applicationStatus: "withdrawn", applicationAt: recent, now })).toBe(false);
    expect(hasChatRejoinCooldown({ memberStatus: "left", statusChangedAt: recent, applicationStatus: null, applicationAt: null, now })).toBe(true);
    expect(hasChatRejoinCooldown({ memberStatus: "banned", statusChangedAt: recent, applicationStatus: null, applicationAt: null, now })).toBe(false);
  });

  it("expires timed group mutes and preserves only explicit unbounded mute state", () => {
    const now = new Date("2026-11-03T12:00:00.000Z");
    expect(isChatMemberMuted({ muted: true, mutedUntil: new Date("2026-11-03T13:00:00.000Z"), now })).toBe(true);
    expect(isChatMemberMuted({ muted: true, mutedUntil: new Date("2026-11-03T11:59:59.999Z"), now })).toBe(false);
    expect(isChatMemberMuted({ muted: true, mutedUntil: null, now })).toBe(true);
    expect(isChatMemberMuted({ muted: false, mutedUntil: new Date("2026-11-03T13:00:00.000Z"), now })).toBe(false);
    expect(chatMuteExpiry(1, now)?.toISOString()).toBe("2026-11-03T13:00:00.000Z");
    expect(chatMuteExpiry(24, now)?.toISOString()).toBe("2026-11-04T12:00:00.000Z");
    expect(chatMuteExpiry(168, now)?.toISOString()).toBe("2026-11-10T12:00:00.000Z");
    expect(chatMuteExpiry(2, now)).toBeNull();
    expect(chatMuteRemainingMs("2026-11-03T13:00:00.000Z", now.getTime())).toBe(60 * 60 * 1000);
    expect(chatMuteRemainingMs("2026-11-03T11:59:59.999Z", now.getTime())).toBe(0);
    expect(chatMuteRemainingMs(null, now.getTime())).toBeNull();
  });

  it("only permits local chat paths for login return", () => {
    expect(sanitizeGroupChatReturnPath("/chat/invite/abc?from=mail")).toBe("/chat/invite/abc?from=mail");
    expect(sanitizeGroupChatReturnPath("//attacker.example/chat")).toBeNull();
    expect(sanitizeGroupChatReturnPath("https://attacker.example/" )).toBeNull();
    expect(sanitizeGroupChatReturnPath("/user")).toBeNull();
  });

  it("limits site emoji entries to safe shortcodes and plain Unicode text", () => {
    expect(groupEmojiInputSchema.safeParse({ shortcode: "spark", emoji: "✨", name: "闪光", category: "表情", sortOrder: 1 }).success).toBe(true);
    expect(groupEmojiInputSchema.parse({ shortcode: ":spark:", emoji: "✨", name: "闪光", category: "表情" }).shortcode).toBe("spark");
    expect(groupEmojiInputSchema.safeParse({ shortcode: "x", emoji: "✨", name: "闪光", category: "表情" }).success).toBe(false);
    expect(groupEmojiInputSchema.safeParse({ shortcode: "bad", emoji: "<img src=x>", name: "攻击", category: "表情" }).success).toBe(false);
  });
});
