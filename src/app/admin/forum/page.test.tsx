import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import AdminForumPage from "./page";
import AdminForumTopicEditPage from "./[id]/edit/page";

Object.assign(globalThis, { React });
vi.mock("@/app/admin/forum/actions", () => ({ moderateForumContentAction: vi.fn(), resolveForumReportAction: vi.fn(), updateForumPostAction: vi.fn() }));
vi.mock("@/app/admin/admin-ui", () => ({
  AdminSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminContentShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: async () => "zh" }));
vi.mock("@/lib/db", () => ({ prisma: {
  forumPost: {
    findMany: async (args: { where?: { status?: string } }) => args.where?.status === "pending"
      ? [{ id: "pending-post", author: { nickname: "用户" }, title: "等待审核", content: "正文", category: "workflow", attachments: [] }]
      : [{ id: "approved-post", author: { nickname: "用户" }, title: "已发布话题", content: "已发布正文", category: "experience", status: "approved", createdAt: new Date("2026-11-20T00:00:00Z") }],
    findUnique: async () => ({ id: "post-1", category: "workflow", title: "可编辑话题", content: "现有正文", status: "approved", coverAttachmentId: "attachment-1", attachments: [{ id: "attachment-1", kind: "image", mimeType: "image/png", originalName: "cover.png" }] }),
  },
  forumReply: { findMany: async () => [] }, forumReport: { findMany: async () => [] },
} }));

it("submits an explicit review result without depending on the clicked button's name", async () => {
  const html = renderToStaticMarkup(await AdminForumPage());
  const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)!;
  expect(forms).toHaveLength(2);
  for (const [index, status] of ["approved", "rejected"].entries()) {
    expect(forms[index]).toContain(`name="status" value="${status}"`);
    expect(forms[index]).toContain('name="id" value="pending-post"');
    expect(forms[index]).toContain('name="type" value="post"');
  }
});

it("lets administrators open an editor for published topics", async () => {
  const html = renderToStaticMarkup(await AdminForumPage());

  expect(html).toContain("已发布话题");
  expect(html).toContain('href="/admin/forum/approved-post/edit"');
});

it("preloads a topic into the administrator editor and shows its existing media", async () => {
  const html = renderToStaticMarkup(await AdminForumTopicEditPage({ params: Promise.resolve({ id: "post-1" }) }));

  expect(html).toContain("可编辑话题");
  expect(html).toContain('name="id" value="post-1"');
  expect(html).toContain('name="title"');
  expect(html).toContain("话题图片和附件");
  expect(html).toContain("/api/forum/media/attachment-1");
  expect(html).toContain('name="attachmentIds" value="attachment-1"');
  expect(html).toContain('name="coverAttachmentId" value="attachment-1"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain("当前封面");
  expect(html).toContain("插入正文");
  expect(html).toContain("长按移除");
  expect(html).toContain("添加图片");
});
