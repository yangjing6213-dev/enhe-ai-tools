import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/user-avatar", () => ({ resolveUserAvatarSrc: vi.fn(async (value: string) => value?.startsWith("/uploads/") ? value.replace("/uploads/", "/api/uploads/") : value) }));

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { comment: { findMany } }
}));

import { getHomepageCommentCards } from "./homepage-comment-data";

describe("getHomepageCommentCards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/fixture");
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "0");
  });

  it("reads only approved homepage-selected comments and selects display fields without account contacts", async () => {
    findMany.mockResolvedValue([
      {
        id: "comment-1",
        content: "A real selected comment.",
        tool: { name: "产品名称", englishName: "Product Name" },
        user: { nickname: "Mia", avatar: "/uploads/mia.png" },
        rating: 4
      }
    ]);

    await expect(getHomepageCommentCards("en")).resolves.toEqual([
      {
        id: "comment-1",
        displayName: "Mia",
        productLabel: "Product Name",
        quote: "A real selected comment.",
        avatarSrc: "/api/uploads/mia.png",
        avatarAlt: "Mia",
        stars: 4
      }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "approved", showOnHomepage: true },
      select: {
        id: true,
        content: true,
        rating: true,
        tool: { select: { name: true, englishName: true } },
        user: { select: { nickname: true, avatar: true } }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5
    });
  });

  it("uses the empty list when the database is not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(getHomepageCommentCards("zh")).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
