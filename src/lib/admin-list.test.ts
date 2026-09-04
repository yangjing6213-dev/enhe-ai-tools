import { describe, expect, it } from "vitest";
import {
  buildAdminToolWhere,
  buildAdminCommentPageHref,
  buildAdminFilePageHref,
  buildAdminRefundPageHref,
  buildAdminToolPageHref,
  buildAdminUserPageHref,
  parseAdminCommentListParams,
  parseAdminFileListParams,
  parseAdminRefundListParams,
  parseAdminToolListParams,
  parseAdminUserListParams
} from "@/lib/admin-list";

describe("admin list helpers", () => {
  it("parses user filters with safe pagination", () => {
    expect(parseAdminUserListParams({ q: "  admin  ", role: "admin", status: "active", page: "3" })).toMatchObject({
      q: "admin",
      role: "admin",
      status: "active",
      page: 3,
      skip: 40,
      take: 20
    });
    expect(parseAdminUserListParams({ role: "owner", page: "-9" })).toMatchObject({ role: undefined, page: 1, skip: 0 });
  });

  it("parses tool and comment filters consistently", () => {
    expect(parseAdminToolListParams({ q: " renamer ", status: "published", categoryId: "cat-1", page: "2" })).toMatchObject({
      q: "renamer",
      status: "published",
      categoryId: "cat-1",
      page: 2
    });
    expect(parseAdminCommentListParams({ q: " bad ", status: "pending", pinned: "true", page: "2" })).toMatchObject({
      q: "bad",
      status: "pending",
      pinned: true,
      page: 2
    });
    expect(parseAdminFileListParams({ q: " installer ", storage: "cos", page: "4" })).toMatchObject({
      q: "installer",
      storage: "cos",
      page: 4,
      skip: 60,
      take: 20
    });
  });

  it("searches tools by English name as well as Chinese name", () => {
    expect(buildAdminToolWhere("software", { q: "license", status: undefined, categoryId: undefined })).toMatchObject({
      type: "software",
      OR: expect.arrayContaining([
        { name: { contains: "license", mode: "insensitive" } },
        { englishName: { contains: "license", mode: "insensitive" } }
      ])
    });
  });

  it("builds page links while preserving active filters", () => {
    expect(buildAdminUserPageHref({ q: "enhe", role: "user", status: "active" }, 2)).toBe(
      "/admin/users?q=enhe&role=user&status=active&page=2"
    );
    expect(buildAdminToolPageHref("/admin/software", { q: "zip", status: "draft", categoryId: "cat-1" }, 1)).toBe(
      "/admin/software?q=zip&status=draft&categoryId=cat-1&page=1"
    );
    expect(buildAdminCommentPageHref({ q: "", status: undefined, pinned: false }, 1)).toBe("/admin/comments?pinned=false&page=1");
    expect(buildAdminFilePageHref({ q: "setup", storage: "local", toolId: "tool-1" }, 3)).toBe(
      "/admin/files?q=setup&storage=local&toolId=tool-1&page=3"
    );
  });

  it("parses refund filters and keeps refund pagination links stable", () => {
    expect(parseAdminRefundListParams({ q: " ENHE2026 ", status: "pending", page: "2" })).toMatchObject({
      q: "ENHE2026",
      status: "pending",
      page: 2,
      skip: 20,
      take: 20
    });
    expect(parseAdminRefundListParams({ status: "unknown", page: "0" })).toMatchObject({
      status: undefined,
      page: 1,
      skip: 0
    });
    expect(buildAdminRefundPageHref({ q: "order", status: "completed" }, 4)).toBe(
      "/admin/refunds?q=order&status=completed&page=4"
    );
  });
});
