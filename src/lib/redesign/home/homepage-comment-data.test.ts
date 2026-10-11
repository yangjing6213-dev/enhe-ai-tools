import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("reads only approved homepage-selected comments and excludes account data", async () => {
    findMany.mockResolvedValue([
      {
        id: "comment-1",
        content: "A real selected comment.",
        tool: { name: "产品名称", englishName: "Product Name" },
        user: { email: "private@example.test" }
      }
    ]);

    await expect(getHomepageCommentCards("en")).resolves.toEqual([
      {
        id: "comment-1",
        displayName: "ENHE AI user",
        productLabel: "Product Name",
        quote: "A real selected comment."
      }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "approved", showOnHomepage: true },
      select: {
        id: true,
        content: true,
        tool: { select: { name: true, englishName: true } }
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
