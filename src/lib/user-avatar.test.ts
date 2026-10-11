import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSecureCosMediaUrl } = vi.hoisted(() => ({
  getSecureCosMediaUrl: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({ getSecureCosMediaUrl }));

import { resolveUserAvatarSrc } from "@/lib/user-avatar";

describe("user avatar sources", () => {
  beforeEach(() => getSecureCosMediaUrl.mockReset());

  it("uses a signed image URL for private Tencent Cloud avatar files", async () => {
    getSecureCosMediaUrl.mockResolvedValue(new URL("https://cos.example/avatar.png?signature=valid"));

    await expect(resolveUserAvatarSrc("cos://enhe-bucket/user-avatars/avatar.png"))
      .resolves.toBe("https://cos.example/avatar.png?signature=valid");
    expect(getSecureCosMediaUrl).toHaveBeenCalledWith("cos://enhe-bucket/user-avatars/avatar.png");
  });

  it("re-signs legacy public-looking Tencent Cloud URLs when the object is private", async () => {
    getSecureCosMediaUrl.mockResolvedValue(new URL("https://cos.example/avatar.png?signature=valid"));

    await expect(resolveUserAvatarSrc(
      "https://enhe-bucket.cos.ap-shanghai.myqcloud.com/user-avatars/avatar.png",
    )).resolves.toBe("https://cos.example/avatar.png?signature=valid");
    expect(getSecureCosMediaUrl).toHaveBeenCalledWith(
      "https://enhe-bucket.cos.ap-shanghai.myqcloud.com/user-avatars/avatar.png",
    );
  });

  it("uses the local upload endpoint for locally stored avatar files", async () => {
    getSecureCosMediaUrl.mockResolvedValue(null);

    await expect(resolveUserAvatarSrc("/uploads/user-avatars/avatar.png"))
      .resolves.toBe("/api/uploads/user-avatars/avatar.png");
  });

  it("does not expose a private storage URI if signing is unavailable", async () => {
    getSecureCosMediaUrl.mockResolvedValue(null);

    await expect(resolveUserAvatarSrc("cos://enhe-bucket/user-avatars/avatar.png"))
      .resolves.toBeNull();
  });
});
