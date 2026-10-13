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
    const response = await GET(new Request("https://example.test/api/user/avatar"));
    expect(response.headers.get("location")).toBe("https://example.test/api/uploads/custom.png");
    expect(mocks.avatar).toHaveBeenCalledWith("/uploads/custom.png");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
  });
  it("uses a default for users without an avatar", async () => {
    mocks.user.mockResolvedValue({ id: "user-2", avatar: null });
    mocks.avatar.mockResolvedValue(null);
    const response = await GET(new Request("https://example.test/api/user/avatar"));
    expect(response.headers.get("location")).toBe(`https://example.test${getDefaultAvatar("user-2")}`);
  });
  it("does not expose another user avatar to anonymous requests", async () => {
    mocks.user.mockResolvedValue(null);
    const response = await GET(new Request("https://example.test/api/user/avatar?userId=someone-else"));
    expect(response.headers.get("location")).toBe(`https://example.test${getDefaultAvatar("guest")}`);
    expect(mocks.avatar).not.toHaveBeenCalled();
  });
});
