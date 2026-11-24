import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  currentLocale: vi.fn(),
  revalidatePath: vi.fn(),
  audit: vi.fn(),
  postUpdate: vi.fn(),
  postFindUnique: vi.fn(),
  replyUpdate: vi.fn(),
  replyFindUnique: vi.fn(),
  reportUpdate: vi.fn(),
  attachmentFindMany: vi.fn(),
  attachmentUpdateMany: vi.fn(),
  attachmentDeleteMany: vi.fn(),
  deleteMediaFile: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.currentLocale }));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit }));
vi.mock("@/lib/db", () => ({
  prisma: {
    forumPost: { update: mocks.postUpdate, findUnique: mocks.postFindUnique },
    forumReply: { update: mocks.replyUpdate, findUnique: mocks.replyFindUnique },
    forumReport: { update: mocks.reportUpdate },
    forumAttachment: { findMany: mocks.attachmentFindMany, updateMany: mocks.attachmentUpdateMany, deleteMany: mocks.attachmentDeleteMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/forum-media-storage", () => ({ deleteForumMediaStoredFile: mocks.deleteMediaFile }));

import { moderateForumContentAction, resolveForumReportAction } from "@/app/admin/forum/actions";
import * as forumActions from "@/app/admin/forum/actions";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("forum moderation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
    mocks.currentLocale.mockResolvedValue("zh");
    mocks.postFindUnique.mockResolvedValue({ id: "post-1", status: "pending", category: "question", title: "旧标题", content: "旧正文" });
    mocks.replyFindUnique.mockResolvedValue({ id: "reply-1", status: "pending", postId: "post-1" });
    mocks.postUpdate.mockResolvedValue({ id: "post-1" });
    mocks.replyUpdate.mockResolvedValue({ id: "reply-1" });
    mocks.reportUpdate.mockResolvedValue({ id: "report-1" });
    mocks.attachmentFindMany.mockResolvedValue([]);
    mocks.attachmentUpdateMany.mockResolvedValue({ count: 1 });
    mocks.attachmentDeleteMany.mockResolvedValue({ count: 1 });
    mocks.deleteMediaFile.mockResolvedValue(true);
    mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
      forumPost: { update: mocks.postUpdate },
      forumAttachment: { updateMany: mocks.attachmentUpdateMany, deleteMany: mocks.attachmentDeleteMany },
    }));
  });

  it("requires an administrator and records moderation in the audit log", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    await expect(moderateForumContentAction(form({ type: "post", id: "post-1", status: "approved" }))).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.postUpdate).not.toHaveBeenCalled();

    await moderateForumContentAction(form({ type: "post", id: "post-1", status: "approved" }));
    expect(mocks.postUpdate).toHaveBeenCalledWith({ where: { id: "post-1" }, data: { status: "approved" } });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ adminId: "admin-1", action: "forum.post.approved", targetId: "post-1" }));
  });

  it("resolves reports only for administrators", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    await expect(resolveForumReportAction(form({ id: "report-1" }))).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.reportUpdate).not.toHaveBeenCalled();

    await resolveForumReportAction(form({ id: "report-1" }));
    expect(mocks.reportUpdate).toHaveBeenCalledWith({ where: { id: "report-1" }, data: { status: "resolved", resolvedAt: expect.any(Date) } });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "forum.report.resolved", targetId: "report-1" }));
  });

  it("allows administrators to edit a topic while preserving its attachment relations", async () => {
    const updateTopic = (forumActions as Record<string, unknown>).updateForumPostAction as ((data: FormData) => Promise<void>) | undefined;
    expect(updateTopic).toBeTypeOf("function");
    if (!updateTopic) return;

    mocks.requireAdmin.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const data = form({ id: "post-1", category: "experience", title: "更新标题", content: "更新正文" });
    await expect(updateTopic(data)).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.postUpdate).not.toHaveBeenCalled();

    await updateTopic(data);
    expect(mocks.postUpdate).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { category: "experience", title: "更新标题", content: "更新正文" },
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      adminId: "admin-1", action: "forum.post.edited", targetId: "post-1",
      metadata: { category: "experience", titleChanged: true, contentChanged: true },
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/forum/post-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/forum/post-1");
  });

  it("rejects invalid topic edits before writing", async () => {
    const updateTopic = (forumActions as Record<string, unknown>).updateForumPostAction as ((data: FormData) => Promise<void>) | undefined;
    expect(updateTopic).toBeTypeOf("function");
    if (!updateTopic) return;

    await expect(updateTopic(form({ id: "post-1", category: "other", title: "x", content: "正文" }))).rejects.toThrow("FORUM_INVALID_POST");
    expect(mocks.postFindUnique).not.toHaveBeenCalled();
    expect(mocks.postUpdate).not.toHaveBeenCalled();
  });

  it("removes deselected images from an edited topic and retires their stored files", async () => {
    const updateTopic = (forumActions as Record<string, unknown>).updateForumPostAction as ((data: FormData) => Promise<void>) | undefined;
    expect(updateTopic).toBeTypeOf("function");
    if (!updateTopic) return;

    mocks.postFindUnique.mockResolvedValueOnce({
      id: "post-1", category: "workflow", title: "旧标题", content: "旧正文",
      attachments: [{ id: "image-1", kind: "image", fileSize: 2048, filePath: "forum-media/image-1.webp", authorId: "author-1", postId: "post-1", replyId: null, discardedAt: null, createdAt: new Date() }],
    });
    const data = form({ id: "post-1", category: "workflow", title: "新标题", content: "新正文", manageAttachments: "true" });

    await updateTopic(data);

    expect(mocks.attachmentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ["image-1"] }, postId: "post-1" }),
      data: expect.objectContaining({ postId: null, discardedAt: expect.any(Date) }),
    }));
    expect(mocks.deleteMediaFile).toHaveBeenCalledWith("forum-media/image-1.webp");
    expect(mocks.attachmentDeleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "image-1", postId: null }) }));
  });

  it("attaches newly uploaded images to the edited topic after verifying the admin owns them", async () => {
    const updateTopic = (forumActions as Record<string, unknown>).updateForumPostAction as ((data: FormData) => Promise<void>) | undefined;
    expect(updateTopic).toBeTypeOf("function");
    if (!updateTopic) return;

    mocks.postFindUnique.mockResolvedValueOnce({ id: "post-1", category: "workflow", title: "旧标题", content: "旧正文", attachments: [] });
    mocks.attachmentFindMany.mockResolvedValueOnce([{
      id: "new-image", authorId: "admin-1", kind: "image", fileSize: 2048,
      postId: null, replyId: null, discardedAt: null, createdAt: new Date(),
    }]);
    const data = form({ id: "post-1", category: "workflow", title: "新标题", content: "[[media:new-image]]", manageAttachments: "true" });
    data.append("attachmentIds", "new-image");

    await updateTopic(data);

    expect(mocks.attachmentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["new-image"] } }) }));
    expect(mocks.attachmentUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ["new-image"] }, authorId: "admin-1", postId: null }),
      data: { postId: "post-1" },
    }));
  });

  it("updates the selected topic cover from the retained image attachments", async () => {
    const updateTopic = (forumActions as Record<string, unknown>).updateForumPostAction as ((data: FormData) => Promise<void>) | undefined;
    expect(updateTopic).toBeTypeOf("function");
    if (!updateTopic) return;

    const createdAt = new Date();
    mocks.postFindUnique.mockResolvedValueOnce({
      id: "post-1", category: "workflow", title: "旧标题", content: "旧正文", coverAttachmentId: "image-1",
      attachments: [
        { id: "image-1", kind: "image", fileSize: 2048, filePath: "forum-media/image-1.webp", authorId: "admin-1", postId: "post-1", replyId: null, discardedAt: null, createdAt },
        { id: "image-2", kind: "image", fileSize: 2048, filePath: "forum-media/image-2.webp", authorId: "admin-1", postId: "post-1", replyId: null, discardedAt: null, createdAt },
      ],
    });
    const data = form({ id: "post-1", category: "workflow", title: "新标题", content: "新正文", manageAttachments: "true", coverAttachmentId: "image-2" });
    data.append("attachmentIds", "image-1");
    data.append("attachmentIds", "image-2");

    await updateTopic(data);

    expect(mocks.postUpdate).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { category: "workflow", title: "新标题", content: "新正文", coverAttachmentId: "image-2" },
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ coverChanged: true }),
    }));
  });

  it("rejects a video as the topic cover before writing", async () => {
    const updateTopic = (forumActions as Record<string, unknown>).updateForumPostAction as ((data: FormData) => Promise<void>) | undefined;
    expect(updateTopic).toBeTypeOf("function");
    if (!updateTopic) return;

    mocks.postFindUnique.mockResolvedValueOnce({
      id: "post-1", category: "workflow", title: "旧标题", content: "旧正文", coverAttachmentId: null,
      attachments: [{ id: "video-1", kind: "video", fileSize: 2048, filePath: "forum-media/video-1.mp4", authorId: "admin-1", postId: "post-1", replyId: null, discardedAt: null, createdAt: new Date() }],
    });
    const data = form({ id: "post-1", category: "workflow", title: "新标题", content: "新正文", manageAttachments: "true", coverAttachmentId: "video-1" });
    data.append("attachmentIds", "video-1");

    await expect(updateTopic(data)).rejects.toThrow("FORUM_INVALID_COVER_ATTACHMENT");
    expect(mocks.postUpdate).not.toHaveBeenCalled();
  });
});
