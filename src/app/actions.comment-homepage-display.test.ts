import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getCurrentLocale: vi.fn(),
  requireAdmin: vi.fn(),
  requireUser: vi.fn(),
  updateComment: vi.fn(),
  updateManyComments: vi.fn(),
  findComment: vi.fn(),
  deleteComment: vi.fn(),
  writeAdminAuditLog: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.getCurrentLocale }));
vi.mock("@/lib/db", () => ({
  prisma: { comment: { update: mocks.updateComment, updateMany: mocks.updateManyComments, findUnique: mocks.findComment, delete: mocks.deleteComment } }
}));
vi.mock("@/lib/auth", () => ({
  assertLoginNotLimited: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn(),
  recordLoginAttempt: vi.fn(),
  requireAdmin: mocks.requireAdmin,
  requireUser: mocks.requireUser,
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
  refreshHeaderUserCookieSnapshot: vi.fn(),
  verifyPassword: vi.fn()
}));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.writeAdminAuditLog }));

import { deleteCommentAction, deletePublicCommentAction, updateCommentHomepageDisplayAction, updateCommentStatusAction } from "@/app/actions";

function commentDisplayForm(showOnHomepage: string) {
  const formData = new FormData();
  formData.set("id", "comment-1");
  formData.set("showOnHomepage", showOnHomepage);
  return formData;
}

describe("homepage comment display actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentLocale.mockResolvedValue("zh");
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.requireUser.mockResolvedValue({ id: "user-1", role: "user" });
    mocks.updateManyComments.mockResolvedValue({ count: 1 });
    mocks.updateComment.mockResolvedValue({ id: "comment-1" });
    mocks.deleteComment.mockResolvedValue({
      id: "comment-1",
      toolId: "tool-1",
      tool: { slug: "example-tool", name: "示例工具", englishName: "Example Tool", type: "software" }
    });
    mocks.findComment.mockResolvedValue({ userId: "user-1", status: "approved", tool: { slug: "example-tool", name: "示例工具", englishName: "Example Tool", type: "software" } });
  });

  it("only enables homepage display for approved comments and revalidates both homepages", async () => {
    await updateCommentHomepageDisplayAction(commentDisplayForm("true"));

    expect(mocks.updateManyComments).toHaveBeenCalledWith({
      where: { id: "comment-1", status: "approved" },
      data: { showOnHomepage: true }
    });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: "admin-1",
        action: "comment.homepage_display.update",
        targetId: "comment-1",
        metadata: { showOnHomepage: true }
      })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en");
  });

  it("does not audit a display request when the comment is no longer approved", async () => {
    mocks.updateManyComments.mockResolvedValueOnce({ count: 0 });

    await updateCommentHomepageDisplayAction(commentDisplayForm("true"));

    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it("clears homepage display when moderation removes approval", async () => {
    const formData = new FormData();
    formData.set("id", "comment-1");
    formData.set("status", "rejected");

    await updateCommentStatusAction(formData);

    expect(mocks.updateComment).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { status: "rejected", showOnHomepage: false }
    });
  });

  it("permanently deletes a selected comment and refreshes its detail and homepage surfaces", async () => {
    const formData = new FormData();
    formData.set("id", "comment-1");

    await deleteCommentAction(formData);

    expect(mocks.deleteComment).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      include: { tool: { select: { slug: true, name: true, englishName: true, type: true } } }
    });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "comment.delete",
      targetType: "comment",
      targetId: "comment-1"
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/comments");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/software/example-tool");
  });

  it("lets an author soft-delete their own comment and refreshes public views", async () => {
    const data = new FormData();
    data.set("id", "comment-1");

    await deletePublicCommentAction(data);

    expect(mocks.updateManyComments).toHaveBeenCalledWith({
      where: { id: "comment-1", status: { not: "deleted" }, userId: "user-1" },
      data: { status: "deleted", showOnHomepage: false, isPinned: false },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/software/example-tool");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/en/software/example-tool");
  });

  it("denies deleting another member's comment without changing it", async () => {
    mocks.findComment.mockResolvedValueOnce({ userId: "other-user", status: "approved", tool: { slug: "example-tool", name: "示例工具", englishName: "Example Tool", type: "software" } });
    const data = new FormData();
    data.set("id", "comment-1");

    await expect(deletePublicCommentAction(data)).rejects.toThrow("COMMENT_DELETE_FORBIDDEN");
    expect(mocks.updateManyComments).not.toHaveBeenCalled();
  });

  it("allows an administrator to delete another member's comment", async () => {
    mocks.requireUser.mockResolvedValueOnce({ id: "admin-1", role: "admin" });
    mocks.findComment.mockResolvedValueOnce({ userId: "other-user", status: "approved", tool: { slug: "example-tool", name: "示例工具", englishName: "Example Tool", type: "software" } });
    const data = new FormData();
    data.set("id", "comment-1");

    await deletePublicCommentAction(data);

    expect(mocks.updateManyComments).toHaveBeenCalledWith({
      where: { id: "comment-1", status: { not: "deleted" } },
      data: { status: "deleted", showOnHomepage: false, isPinned: false },
    });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "comment.soft_delete", targetId: "comment-1" }));
  });
});
