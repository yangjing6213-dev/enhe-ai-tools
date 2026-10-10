import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({
  prisma: { notification: { count: mocks.count } },
}));

import { GET } from "./route";

describe("GET /api/user/notifications/unread-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.count.mockResolvedValue(1);
  });

  it("returns whether the signed-in user has unread messages without caching", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(await response.json()).toEqual({ hasUnread: true });
    expect(mocks.count).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    });
  });

  it("does not show an unread indicator when every message was read", async () => {
    mocks.count.mockResolvedValueOnce(0);
    const response = await GET();

    expect(await response.json()).toEqual({ hasUnread: false });
  });

  it("does not query message data for a visitor without an account session", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ hasUnread: false });
    expect(mocks.count).not.toHaveBeenCalled();
  });
});
