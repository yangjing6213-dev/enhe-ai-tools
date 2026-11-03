import { describe, expect, it } from "vitest";
import { isExpiredChatMediaCandidate } from "@/lib/group-chat/media-cleanup";

const now = new Date("2026-11-03T00:00:00.000Z");
const candidate = {
  id: "media-1",
  filePath: "cos://private/chat-media/original.webp",
  thumbnailPath: "cos://private/chat-media/thumb.webp",
  expiresAt: new Date("2026-11-02T00:00:00.000Z"),
  purpose: "message",
  messageId: null,
  discardedAt: null,
  group: { avatarMediaId: null },
};

describe("expired chat media cleanup eligibility", () => {
  it("cleans expired unreferenced uploads and discarded message images", () => {
    expect(isExpiredChatMediaCandidate(candidate, now)).toBe(true);
    expect(isExpiredChatMediaCandidate({ ...candidate, messageId: "message-1", discardedAt: now }, now)).toBe(true);
  });

  it("preserves live attachments, future uploads, and the current group avatar", () => {
    expect(isExpiredChatMediaCandidate({ ...candidate, messageId: "message-1" }, now)).toBe(false);
    expect(isExpiredChatMediaCandidate({ ...candidate, expiresAt: new Date("2026-11-04T00:00:00.000Z") }, now)).toBe(false);
    expect(isExpiredChatMediaCandidate({ ...candidate, group: { avatarMediaId: "media-1" } }, now)).toBe(false);
  });

  it.each(["announcement", "avatar"]) ("preserves expired %s images", (purpose) => {
    expect(isExpiredChatMediaCandidate({ ...candidate, purpose }, now)).toBe(false);
  });
});
