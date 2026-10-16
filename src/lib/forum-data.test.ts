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

  it("loads only the viewer's like state and attachment display metadata", async () => {
    mocks.postFindMany.mockResolvedValue([{ id: "post-1", author: { id: "author", nickname: "用户", avatar: null }, likes: [{ id: "like-1" }] }]);
    const posts = await getForumPosts(undefined, "zh", "viewer-1");
    expect(posts[0].isLiked).toBe(true);
    expect(mocks.postFindMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        likes: expect.objectContaining({ where: { userId: "viewer-1" }, select: { id: true } }),
        attachments: expect.objectContaining({ where: { discardedAt: null }, select: { id: true, kind: true, mimeType: true, originalName: true } }),
      }),
    }));
  });

  it("counts approved nested replies together and preserves each viewer like state", async () => {
    const author = { id: "author", nickname: "用户", avatar: null };
    mocks.postFindFirst.mockResolvedValue({ id: "post-1", author, likes: [] });
    mocks.replyFindMany.mockResolvedValue([
      { id: "reply-1", parentId: null, author, content: "正文", likes: [] },
      { id: "reply-2", parentId: "reply-1", author, content: "子回复", likes: [{ id: "like-2" }] },
    ]);
    const post = await getForumPost("post-1", "zh", "viewer-1");
    expect(post?.replyCount).toBe(2);
    expect(post?.replies[0].children[0].isLiked).toBe(true);
    expect(mocks.replyFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { postId: "post-1", status: "approved" } }));
  });

  it("preserves deleted reply context but excludes tombstones from counts", async () => {
    const author = { id: "author", nickname: "用户", avatar: null };
    mocks.postFindFirst.mockResolvedValue({ id: "post-1", author, likes: [] });
    mocks.replyFindMany.mockResolvedValue([
      { id: "deleted", parentId: null, author, content: "", likes: [], attachments: [], _count: { likes: 0 } },
      { id: "child", parentId: "deleted", author, content: "保留的后续回复", likes: [], attachments: [], _count: { likes: 0 } },
    ]);

    const post = await getForumPost("post-1", "zh");
    expect(post?.replyCount).toBe(1);
    expect(post?.replies[0].content).toBe("");
    expect(post?.replies[0].children[0].content).toBe("保留的后续回复");
    expect(mocks.replyFindMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ attachments: expect.objectContaining({ where: { discardedAt: null } }) }),
    }));
  });

  it("excludes deleted reply bodies from topic-list counts", async () => {
    await getForumPosts();
    expect(mocks.postFindMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        _count: { select: { likes: true, shares: true, bookmarks: true, replies: { where: { status: "approved", content: { not: "" } } } } },
      }),
    }));
  });

  it("loads only the viewer's bookmark and real interaction counts for topic cards", async () => {
    mocks.postFindMany.mockResolvedValue([{ id: "post-1", author: { id: "author", nickname: "用户", avatar: null }, likes: [], bookmarks: [{ id: "bookmark-1" }], _count: { likes: 3, replies: 2, shares: 4, bookmarks: 5 } }]);
    const posts = await getForumPosts(undefined, "zh", "viewer-1");
    expect(posts[0]).toMatchObject({ isBookmarked: true, _count: { likes: 3, replies: 2, shares: 4, bookmarks: 5 } });
    expect(posts[0]).not.toHaveProperty("bookmarks");
    expect(mocks.postFindMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ bookmarks: { where: { userId: "viewer-1" }, select: { id: true }, take: 1 } }),
    }));
  });

  it("loads the same bookmark state and real counts on topic detail", async () => {
    mocks.postFindFirst.mockResolvedValue({ id: "post-1", author: { id: "author", nickname: "用户", avatar: null }, likes: [], bookmarks: [{ id: "bookmark-1" }], _count: { likes: 2, shares: 3, bookmarks: 4 } });
    const post = await getForumPost("post-1", "en", "viewer-1");
    expect(post).toMatchObject({ isBookmarked: true, _count: { likes: 2, shares: 3, bookmarks: 4 } });
    expect(post).not.toHaveProperty("bookmarks");
    expect(mocks.postFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ bookmarks: { where: { userId: "viewer-1" }, select: { id: true }, take: 1 }, _count: { select: { likes: true, shares: true, bookmarks: true } } }),
    }));
  });

  it("does not load any member's bookmark state for an anonymous viewer", async () => {
    mocks.postFindMany.mockResolvedValue([{ id: "post-1", author: { id: "author", nickname: "用户", avatar: null }, likes: [], bookmarks: [], _count: { likes: 0, replies: 0, shares: 0, bookmarks: 0 } }]);
    const posts = await getForumPosts();
    expect(posts[0].isBookmarked).toBe(false);
    expect(mocks.postFindMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ bookmarks: { where: { userId: "" }, select: { id: true }, take: 1 } }),
    }));
  });
});
