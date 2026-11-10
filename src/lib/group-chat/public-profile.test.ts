import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveUserAvatarSrc: vi.fn(),
  getDefaultAvatar: vi.fn((userId: string) => `/images/user-avatars/default-${userId}.webp`),
}));

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/group-chat/policy", () => ({ isChatMemberMuted: vi.fn() }));
vi.mock("@/lib/user-avatar", () => ({ resolveUserAvatarSrc: mocks.resolveUserAvatarSrc }));
vi.mock("@/lib/default-avatar", () => ({ getDefaultAvatar: mocks.getDefaultAvatar }));

import { publicChatProfile } from "./service";

describe("publicChatProfile", () => {
  beforeEach(() => {
    mocks.resolveUserAvatarSrc.mockReset();
    mocks.getDefaultAvatar.mockClear();
  });

  it("resolves stored COS avatar identifiers into browser-readable URLs", async () => {
    mocks.resolveUserAvatarSrc.mockResolvedValue("https://cdn.example.test/signed-avatar.webp");

    await expect(publicChatProfile({ id: "user-1", nickname: " Member ", avatar: "cos://bucket/avatar.webp", role: "member" })).resolves.toEqual({
      id: "user-1",
      nickname: "Member",
      avatar: "https://cdn.example.test/signed-avatar.webp",
      role: "成员",
    });
  });

  it("uses a deterministic default avatar when the stored avatar cannot be resolved", async () => {
    mocks.resolveUserAvatarSrc.mockResolvedValue(null);

    await expect(publicChatProfile({ id: "user-2", nickname: null, avatar: "cos://unavailable/avatar.webp", role: "member" })).resolves.toMatchObject({
      nickname: "ENHE 用户",
      avatar: "/images/user-avatars/default-user-2.webp",
    });
  });
});
