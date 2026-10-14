import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  buildCanonicalToolPath: vi.fn(() => "/software/example-tool"),
  commentFindUnique: vi.fn(),
  commentUpdate: vi.fn(),
  getCurrentLocale: vi.fn(),
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({
  prisma: { comment: { findUnique: mocks.commentFindUnique, update: mocks.commentUpdate } },
}));
vi.mock("@/lib/admin-audit", () => ({ writeAdminAuditLog: mocks.audit }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.getCurrentLocale }));
vi.mock("@/lib/public-slugs", () => ({ buildCanonicalToolPath: mocks.buildCanonicalToolPath }));

import { saveAdminCommentReplyAction } from "@/app/actions";

describe("saveAdminCommentReplyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
    mocks.getCurrentLocale.mockResolvedValue("zh");
    mocks.commentFindUnique.mockResolvedValue({
      status: "approved",
      tool: { id: "tool-1", slug: "example-tool", name: "示例工具", englishName: "Example Tool", type: "software" },
    });
    mocks.commentUpdate.mockResolvedValue({ id: "comment-1" });
  });

  it("saves an administrator reply only for an approved comment", async () => {
    const formData = new FormData();
    formData.set("id", "comment-1");
    formData.set("reply", "感谢你的反馈，我们会继续改进。");

    await saveAdminCommentReplyAction(formData);

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.commentUpdate).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      data: { adminReply: "感谢你的反馈，我们会继续改进。", adminReplyAt: expect.any(Date) },
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      adminId: "admin-1",
      action: "comment.admin_reply.save",
      targetType: "comment",
      targetId: "comment-1",
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/comments");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/software/example-tool");
  });

  it("does not save a reply when the comment has not been approved", async () => {
    mocks.commentFindUnique.mockResolvedValue({ status: "pending", tool: {} });
    const formData = new FormData();
    formData.set("id", "comment-1");
    formData.set("reply", "感谢你的反馈，我们会继续改进。");

    await expect(saveAdminCommentReplyAction(formData)).rejects.toThrow("COMMENT_NOT_APPROVED");
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });

  it("does not save a reply when administrator access is denied", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("UNAUTHORIZED"));
    const formData = new FormData();
    formData.set("id", "comment-1");
    formData.set("reply", "感谢你的反馈，我们会继续改进。");

    await expect(saveAdminCommentReplyAction(formData)).rejects.toThrow("UNAUTHORIZED");
    expect(mocks.commentFindUnique).not.toHaveBeenCalled();
    expect(mocks.commentUpdate).not.toHaveBeenCalled();
  });
});
