import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { DEFAULT_AVATAR_COUNT, GENDER_AVATAR_COUNTS, getDefaultAvatar } from "./default-avatar";

describe("default avatars", () => {
  it("chooses only existing assets from the selected gender folder", () => {
    for (const gender of ["male", "female"] as const) {
      expect(GENDER_AVATAR_COUNTS[gender]).toBeGreaterThan(0);
      for (let index = 0; index < 100; index++) {
        const avatar = getDefaultAvatar(`user-${index}`, gender);
        expect(avatar).toContain(`/user-avatars/${gender}/`);
        expect(existsSync(`public${avatar}`)).toBe(true);
        expect(getDefaultAvatar(`user-${index}`, gender)).toBe(avatar);
      }
    }
  });
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
