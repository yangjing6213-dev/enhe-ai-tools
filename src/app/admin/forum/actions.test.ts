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
  },
}));

import { moderateForumContentAction, resolveForumReportAction } from "@/app/admin/forum/actions";

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
    mocks.postFindUnique.mockResolvedValue({ id: "post-1", status: "pending" });
    mocks.replyFindUnique.mockResolvedValue({ id: "reply-1", status: "pending", postId: "post-1" });
    mocks.postUpdate.mockResolvedValue({ id: "post-1" });
    mocks.replyUpdate.mockResolvedValue({ id: "reply-1" });
    mocks.reportUpdate.mockResolvedValue({ id: "report-1" });
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
});
