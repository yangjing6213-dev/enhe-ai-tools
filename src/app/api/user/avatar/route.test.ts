import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultAvatar } from "@/lib/default-avatar";
const mocks = vi.hoisted(() => ({ user: vi.fn(), avatar: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/user-avatar", () => ({ resolveUserAvatarSrc: mocks.avatar }));
import { GET } from "./route";

describe("current user header avatar", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uses the current uploaded avatar and prevents shared caching", async () => {
    mocks.user.mockResolvedValue({ id: "user-1", avatar: "/uploads/custom.png" });
    mocks.avatar.mockResolvedValue("/api/uploads/custom.png");
    const response = await GET();
    expect(response.headers.get("location")).toBe("/api/uploads/custom.png");
    expect(mocks.avatar).toHaveBeenCalledWith("/uploads/custom.png");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
  });
  it("keeps saved gender avatars on the browser public origin rather than the internal server", async () => {
    mocks.user.mockResolvedValue({ id: "user-1", avatar: "/images/user-avatars/female/avatar-03.webp" });
    mocks.avatar.mockResolvedValue("/images/user-avatars/female/avatar-03.webp");
    const response = await GET();
    expect(response.headers.get("location")).toBe("/images/user-avatars/female/avatar-03.webp");
    expect(new URL(response.headers.get("location")!, "https://www.enhe-tech.com.cn/api/user/avatar").origin).toBe("https://www.enhe-tech.com.cn");
  });
  it("preserves signed cloud avatar URLs", async () => {
    mocks.user.mockResolvedValue({ id: "user-1", avatar: "cos://bucket/avatar.png" });
    mocks.avatar.mockResolvedValue("https://storage.example/avatar.png?signature=test");
    const response = await GET();
    expect(response.headers.get("location")).toBe("https://storage.example/avatar.png?signature=test");
  });
  it("uses a default for users without an avatar", async () => {
    mocks.user.mockResolvedValue({ id: "user-2", avatar: null });
    mocks.avatar.mockResolvedValue(null);
    const response = await GET();
    expect(response.headers.get("location")).toBe(getDefaultAvatar("user-2"));
  });
  it("does not expose another user avatar to anonymous requests", async () => {
    mocks.user.mockResolvedValue(null);
    const response = await GET();
    expect(response.headers.get("location")).toBe(getDefaultAvatar("guest"));
    expect(mocks.avatar).not.toHaveBeenCalled();
  });
});
