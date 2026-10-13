import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { DEFAULT_AVATAR_COUNT, getDefaultAvatar } from "./default-avatar";

describe("default avatars", () => {
  it("keeps the assigned avatar stable for a user", () => {
    expect(getDefaultAvatar("user-1")).toBe(getDefaultAvatar("user-1"));
  });
  it("has all twenty supplied avatars available", () => {
    expect(DEFAULT_AVATAR_COUNT).toBe(20);
    for (let i = 1; i <= DEFAULT_AVATAR_COUNT; i++) {
      expect(existsSync(`public/images/user-avatars/avatar-${String(i).padStart(2, "0")}.webp`)).toBe(true);
    }
  });
  it("always chooses a supported avatar including empty and emoji names", () => {
    for (const seed of ["", "用户", "🙂", ...Array.from({ length: 100 }, (_, i) => `user-${i}`)]) {
      expect(existsSync(`public${getDefaultAvatar(seed)}`)).toBe(true);
    }
  });
});
