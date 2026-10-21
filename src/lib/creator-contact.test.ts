import { describe, expect, it } from "vitest";
import {
  CREATOR_MESSAGE_DAILY_LIMIT,
  hasReachedCreatorMessageLimit,
  normalizeCreatorMessage,
} from "@/lib/creator-contact";

describe("creator contact message validation", () => {
  it("trims messages and rejects empty, short, and oversized values", () => {
    expect(normalizeCreatorMessage("  请问支持哪些系统？  ")).toBe("请问支持哪些系统？");
    expect(normalizeCreatorMessage(" ")).toBeNull();
    expect(normalizeCreatorMessage("x")).toBeNull();
    expect(normalizeCreatorMessage("x".repeat(1001))).toBeNull();
    expect(normalizeCreatorMessage(null)).toBeNull();
  });

  it("limits each sender to five creator messages per day", () => {
    expect(CREATOR_MESSAGE_DAILY_LIMIT).toBe(5);
    expect(hasReachedCreatorMessageLimit(4)).toBe(false);
    expect(hasReachedCreatorMessageLimit(5)).toBe(true);
  });
});
