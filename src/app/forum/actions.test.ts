import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentLocale: vi.fn(),
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  postCount: vi.fn(),
  postCreate: vi.fn(),
  postFindUnique: vi.fn(),
  replyCount: vi.fn(),
  replyCreate: vi.fn(),
  replyFindUnique: vi.fn(),
  likeCount: vi.fn(),
  likeFindFirst: vi.fn(),
  likeCreate: vi.fn(),
  likeDelete: vi.fn(),
  attachmentFindMany: vi.fn(),
  attachmentUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.currentLocale }));
vi.mock("@/lib/db", () => ({
  prisma: {
    forumPost: { count: mocks.postCount, create: mocks.postCreate, findUnique: mocks.postFindUnique },
    forumReply: { count: mocks.replyCount, create: mocks.replyCreate, findUnique: mocks.replyFindUnique },
    forumLike: { count: mocks.likeCount, findFirst: mocks.likeFindFirst, create: mocks.likeCreate, deleteMany: mocks.likeDelete },
    forumAttachment: { findMany: mocks.attachmentFindMany, updateMany: mocks.attachmentUpdateMany },
    $transaction: mocks.transaction,
  },
}));

import { createForumPostAction, createForumReplyAction, toggleForumLikeAction } from "@/app/forum/actions";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("forum member actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentLocale.mockResolvedValue("zh");
    mocks.requireUser.mockResolvedValue({ id: "user-1", role: "user" });
    mocks.postCount.mockResolvedValue(0);
    mocks.replyCount.mockResolvedValue(0);
    mocks.likeCount.mockResolvedValue(0);
    mocks.postCreate.mockResolvedValue({ id: "post-1" });
    mocks.postFindUnique.mockResolvedValue({ status: "approved" });
    mocks.replyCreate.mockResolvedValue({ id: "reply-1" });
    mocks.replyFindUnique.mockResolvedValue(null);
    mocks.likeFindFirst.mockResolvedValue(null);
    mocks.likeCreate.mockResolvedValue({ id: "like-1" });
    mocks.likeDelete.mockResolvedValue({ count: 1 });
    mocks.attachmentFindMany.mockResolvedValue([]);
    mocks.attachmentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (run) => run({
      forumPost: { create: mocks.postCreate },
      forumReply: { create: mocks.replyCreate },
      forumAttachment: { findMany: mocks.attachmentFindMany, updateMany: mocks.attachmentUpdateMany },
    }));
  });

  it("requires login and queues new posts for review", async () => {
    mocks.requireUser.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    await expect(createForumPostAction(form({ category: "question", title: "求助", content: "如何开始？" }))).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.postCreate).not.toHaveBeenCalled();

    await createForumPostAction(form({ category: "question", title: "求助", content: "如何开始？" }));
    expect(mocks.postCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ authorId: "user-1", status: "pending", title: "求助" }) });
  });

  it("requires an approved post and queues replies for review", async () => {
    const data = form({ postId: "post-1", content: "我也想了解。" });
    mocks.postFindUnique.mockResolvedValueOnce({ status: "pending" });
    await expect(createForumReplyAction(data)).rejects.toThrow("FORUM_POST_NOT_AVAILABLE");
    expect(mocks.replyCreate).not.toHaveBeenCalled();

    mocks.postFindUnique.mockResolvedValueOnce({ status: "approved" });
    await createForumReplyAction(data);
    expect(mocks.replyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ postId: "post-1", authorId: "user-1", status: "pending" }) });
  });

  it("rejects attachments owned by another member before creating a post", async () => {
    const data = form({ category: "showcase", title: "我的作品", content: "作品说明" });
    data.append("attachmentIds", "attachment-1");
    mocks.attachmentFindMany.mockResolvedValue([{ id: "attachment-1", authorId: "other-user", kind: "image", fileSize: 1024, postId: null, replyId: null, discardedAt: null, createdAt: new Date() }]);
    await expect(createForumPostAction(data)).rejects.toThrow("FORUM_INVALID_ATTACHMENTS");
    expect(mocks.postCreate).not.toHaveBeenCalled();
  });

  it("claims validated post uploads atomically and still queues the post for review", async () => {
    const data = form({ category: "showcase", title: "我的作品", content: "作品说明" });
    data.append("attachmentIds", "attachment-1");
    mocks.attachmentFindMany.mockResolvedValue([{ id: "attachment-1", authorId: "user-1", kind: "image", fileSize: 1024, postId: null, replyId: null, discardedAt: null, createdAt: new Date() }]);
    await createForumPostAction(data);
    expect(mocks.transaction).toHaveBeenCalled();
    expect(mocks.attachmentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ authorId: "user-1", postId: null, replyId: null, discardedAt: null, id: { in: ["attachment-1"] } }),
      data: { postId: "post-1" },
    }));
    expect(mocks.postCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "pending" }) });
  });

  it("rejects video uploads and more than four images on a reply", async () => {
    const video = form({ postId: "post-1", content: "看这个作品" });
    video.append("attachmentIds", "video-1");
    mocks.attachmentFindMany.mockResolvedValue([{ id: "video-1", authorId: "user-1", kind: "video", fileSize: 1024, postId: null, replyId: null, discardedAt: null, createdAt: new Date() }]);
    await expect(createForumReplyAction(video)).rejects.toThrow("FORUM_INVALID_ATTACHMENTS");
    const tooMany = form({ postId: "post-1", content: "作品图片" });
    for (let index = 0; index < 5; index += 1) tooMany.append("attachmentIds", `image-${index}`);
    await expect(createForumReplyAction(tooMany)).rejects.toThrow("FORUM_INVALID_ATTACHMENTS");
    expect(mocks.replyCreate).not.toHaveBeenCalled();
  });

  it("rejects an upload claimed by a concurrent submission", async () => {
    const data = form({ category: "showcase", title: "我的作品", content: "作品说明" });
    data.append("attachmentIds", "attachment-1");
    mocks.attachmentFindMany.mockResolvedValue([{ id: "attachment-1", authorId: "user-1", kind: "image", fileSize: 1024, postId: null, replyId: null, discardedAt: null, createdAt: new Date() }]);
    mocks.attachmentUpdateMany.mockResolvedValueOnce({ count: 0 });
    await expect(createForumPostAction(data)).rejects.toThrow("FORUM_INVALID_ATTACHMENTS");
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.attachmentFindMany).toHaveBeenCalledWith({ where: expect.objectContaining({ discardedAt: null }) });
    expect(mocks.attachmentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ discardedAt: null }) }));
  });

  it.each(["post", "reply"])("rejects discarded drafts during %s submission even if a stale read returned them", async (surface) => {
    const data = form(surface === "post" ? { category: "showcase", title: "我的作品", content: "作品说明" } : { postId: "post-1", content: "作品说明" });
    data.append("attachmentIds", "attachment-1");
    mocks.attachmentFindMany.mockResolvedValue([{ id: "attachment-1", authorId: "user-1", kind: "image", fileSize: 1024, postId: null, replyId: null, discardedAt: new Date(), createdAt: new Date() }]);
    await expect(surface === "post" ? createForumPostAction(data) : createForumReplyAction(data)).rejects.toThrow("FORUM_INVALID_ATTACHMENTS");
    expect(mocks.postCreate).not.toHaveBeenCalled();
    expect(mocks.replyCreate).not.toHaveBeenCalled();
  });

  it("requires login for replies and likes", async () => {
    mocks.requireUser.mockRejectedValue(new Error("UNAUTHORIZED"));
    await expect(createForumReplyAction(form({ postId: "post-1", content: "回复内容" }))).rejects.toThrow("UNAUTHORIZED");
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.replyCreate).not.toHaveBeenCalled();
    expect(mocks.likeCreate).not.toHaveBeenCalled();
  });

  it("rejects cross-post replies and nesting beyond five levels", async () => {
    mocks.postFindUnique.mockResolvedValueOnce({ status: "approved" });
    mocks.replyFindUnique.mockResolvedValueOnce({ id: "reply-1", postId: "other-post", parentId: null, status: "approved" });
    await expect(createForumReplyAction(form({ postId: "post-1", parentId: "reply-1", content: "跨帖回复" }))).rejects.toThrow("FORUM_PARENT_NOT_AVAILABLE");

    mocks.postFindUnique.mockResolvedValueOnce({ status: "approved" });
    mocks.replyFindUnique.mockResolvedValue({ id: "reply", postId: "post-1", parentId: "reply-parent", status: "approved" });
    await expect(createForumReplyAction(form({ postId: "post-1", parentId: "reply", content: "第六层" }))).rejects.toThrow("FORUM_REPLY_DEPTH_LIMIT");
    expect(mocks.replyCreate).not.toHaveBeenCalled();
  });

  it("toggles likes only for approved posts", async () => {
    mocks.postFindUnique.mockResolvedValueOnce({ status: "pending" });
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).rejects.toThrow("FORUM_CONTENT_NOT_AVAILABLE");
    expect(mocks.likeCreate).not.toHaveBeenCalled();

    mocks.postFindUnique.mockResolvedValueOnce({ status: "approved" });
    mocks.likeFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "like-1" });
    mocks.likeCount.mockResolvedValueOnce(0).mockResolvedValueOnce(3);
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).resolves.toEqual({ liked: true, count: 3 });
    expect(mocks.likeCreate).toHaveBeenCalledWith({ data: { userId: "user-1", postId: "post-1" } });
  });

  it("removes an existing like when the member selects it again", async () => {
    mocks.likeFindFirst.mockResolvedValueOnce({ id: "like-1" });
    mocks.likeCount.mockResolvedValueOnce(2);
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).resolves.toEqual({ liked: false, count: 2 });
    expect(mocks.likeDelete).toHaveBeenCalledWith({ where: { id: "like-1", userId: "user-1" } });
    expect(mocks.likeCreate).not.toHaveBeenCalled();
  });

  it("returns the actual remaining like when another tab replaces the unlike target", async () => {
    mocks.likeFindFirst.mockResolvedValueOnce({ id: "old-like" }).mockResolvedValueOnce({ id: "new-like" });
    mocks.likeDelete.mockResolvedValueOnce({ count: 0 });
    mocks.likeCount.mockResolvedValueOnce(3);
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).resolves.toEqual({ liked: true, count: 3 });
    expect(mocks.likeFindFirst).toHaveBeenLastCalledWith({ where: { userId: "user-1", postId: "post-1" }, select: { id: true } });
  });

  it("returns unliked if another tab removes the newly created like", async () => {
    mocks.likeFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.likeCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).resolves.toEqual({ liked: false, count: 0 });
  });

});
