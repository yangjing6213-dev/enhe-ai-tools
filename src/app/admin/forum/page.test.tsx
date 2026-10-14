import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import AdminForumPage from "./page";

Object.assign(globalThis, { React });
vi.mock("@/app/admin/forum/actions", () => ({ moderateForumContentAction: vi.fn(), resolveForumReportAction: vi.fn() }));
vi.mock("@/app/admin/admin-ui", () => ({
  AdminSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminContentShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: async () => "zh" }));
vi.mock("@/lib/db", () => ({ prisma: {
  forumPost: { findMany: async () => [{ id: "pending-post", author: { nickname: "用户" }, title: "等待审核", content: "正文", category: "workflow", attachments: [] }] },
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
