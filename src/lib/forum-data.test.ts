import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postFindMany: vi.fn(),
  postFindFirst: vi.fn(),
  replyFindMany: vi.fn(),
  resolveAvatar: vi.fn(async (value?: string | null) => value ?? null),
}));

vi.mock("@/lib/db", () => ({ prisma: { forumPost: { findMany: mocks.postFindMany, findFirst: mocks.postFindFirst }, forumReply: { findMany: mocks.replyFindMany } } }));
vi.mock("@/lib/user-avatar", () => ({ resolveUserAvatarSrc: mocks.resolveAvatar }));
vi.mock("@/lib/default-avatar", () => ({ getDefaultAvatar: vi.fn(() => "/avatar.webp") }));

import { buildForumReplyTree, getForumPost, getForumPosts } from "@/lib/forum-data";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe_test");
  mocks.postFindMany.mockResolvedValue([]);
  mocks.postFindFirst.mockResolvedValue(null);
  mocks.replyFindMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("forum reply tree", () => {
  it("nests replies while leaving top-level replies in publication order", () => {
    const tree = buildForumReplyTree([
      { id: "reply-2", parentId: "reply-1", content: "child" },
      { id: "reply-1", parentId: null, content: "root" },
      { id: "reply-3", parentId: null, content: "second root" },
    ]);

    expect(tree.map((reply) => reply.id)).toEqual(["reply-1", "reply-3"]);
    expect(tree[0].children.map((reply) => reply.id)).toEqual(["reply-2"]);
  });

  it("does not surface orphaned replies whose parent is unavailable", () => {
    expect(buildForumReplyTree([{ id: "reply-1", parentId: "hidden-parent", content: "orphan" }])).toEqual([]);
  });

  it("only queries publicly approved posts and keeps the selected category", async () => {
    await getForumPosts("question", "en");
    expect(mocks.postFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "approved", category: "question" },
      take: 30,
    }));
  });

  it("returns empty public results without a database URL and does not query Prisma", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(getForumPosts()).resolves.toEqual([]);
    await expect(getForumPost("public-post")).resolves.toBeNull();
    expect(mocks.postFindMany).not.toHaveBeenCalled();
    expect(mocks.postFindFirst).not.toHaveBeenCalled();
    expect(mocks.replyFindMany).not.toHaveBeenCalled();
  });

  it("does not query replies for a post that is not public", async () => {
    expect(await getForumPost("pending-post")).toBeNull();
    expect(mocks.postFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "pending-post", status: "approved" } }));
    expect(mocks.replyFindMany).not.toHaveBeenCalled();
  });
});
