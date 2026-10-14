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
  reportCount: vi.fn(),
  reportFindFirst: vi.fn(),
  reportCreate: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.currentLocale }));
vi.mock("@/lib/db", () => ({
  prisma: {
    forumPost: { count: mocks.postCount, create: mocks.postCreate, findUnique: mocks.postFindUnique },
    forumReply: { count: mocks.replyCount, create: mocks.replyCreate, findUnique: mocks.replyFindUnique },
    forumLike: { count: mocks.likeCount, findFirst: mocks.likeFindFirst, create: mocks.likeCreate, delete: mocks.likeDelete },
    forumReport: { count: mocks.reportCount, findFirst: mocks.reportFindFirst, create: mocks.reportCreate },
  },
}));

import { createForumPostAction, createForumReplyAction, reportForumContentAction, toggleForumLikeAction } from "@/app/forum/actions";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("forum member actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentLocale.mockResolvedValue("zh");
    mocks.requireUser.mockResolvedValue({ id: "user-1", role: "user" });
    mocks.postCount.mockResolvedValue(0);
    mocks.replyCount.mockResolvedValue(0);
    mocks.likeCount.mockResolvedValue(0);
    mocks.reportCount.mockResolvedValue(0);
    mocks.postCreate.mockResolvedValue({ id: "post-1" });
    mocks.postFindUnique.mockResolvedValue({ status: "approved" });
    mocks.replyCreate.mockResolvedValue({ id: "reply-1" });
    mocks.replyFindUnique.mockResolvedValue(null);
    mocks.likeFindFirst.mockResolvedValue(null);
    mocks.likeCreate.mockResolvedValue({ id: "like-1" });
    mocks.likeDelete.mockResolvedValue({ id: "like-1" });
    mocks.reportFindFirst.mockResolvedValue(null);
    mocks.reportCreate.mockResolvedValue({ id: "report-1" });
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

  it("requires login for replies, likes, and reports", async () => {
    mocks.requireUser.mockRejectedValue(new Error("UNAUTHORIZED"));
    await expect(createForumReplyAction(form({ postId: "post-1", content: "回复内容" }))).rejects.toThrow("UNAUTHORIZED");
    await expect(toggleForumLikeAction(form({ postId: "post-1" }))).rejects.toThrow("UNAUTHORIZED");
    await expect(reportForumContentAction(form({ postId: "post-1", reason: "违规内容" }))).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.replyCreate).not.toHaveBeenCalled();
    expect(mocks.likeCreate).not.toHaveBeenCalled();
    expect(mocks.reportCreate).not.toHaveBeenCalled();
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
    await toggleForumLikeAction(form({ postId: "post-1" }));
    expect(mocks.likeCreate).toHaveBeenCalledWith({ data: { userId: "user-1", postId: "post-1" } });
  });

  it("removes an existing like when the member selects it again", async () => {
    mocks.likeFindFirst.mockResolvedValueOnce({ id: "like-1" });
    await toggleForumLikeAction(form({ postId: "post-1" }));
    expect(mocks.likeDelete).toHaveBeenCalledWith({ where: { id: "like-1" } });
    expect(mocks.likeCreate).not.toHaveBeenCalled();
  });

  it("does not allow repeat reports for the same target", async () => {
    mocks.reportFindFirst.mockResolvedValueOnce({ id: "report-1" });
    await expect(reportForumContentAction(form({ postId: "post-1", reason: "垃圾内容" }))).rejects.toThrow("FORUM_DUPLICATE_REPORT");
    expect(mocks.reportCreate).not.toHaveBeenCalled();
  });

  it("accepts a report for approved content", async () => {
    await reportForumContentAction(form({ postId: "post-1", reason: "垃圾内容" }));
    expect(mocks.reportCreate).toHaveBeenCalledWith({ data: { reporterId: "user-1", postId: "post-1", reason: "垃圾内容" } });
  });
});
