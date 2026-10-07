import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("admin user-management presentation", () => {
  it("mounts the list and detail pages in the shared light content shell", () => {
    const list = read("app/admin/users/page.tsx");
    const detail = read("app/admin/users/[id]/page.tsx");

    for (const source of [list, detail]) {
      expect(source).toContain("AdminContentShell");
      expect(source).toContain("enhe-admin-content-management");
      expect(source).toContain("enhe-admin-users");
    }
    expect(detail).toContain("enhe-admin-user-detail");
    expect(detail).toContain("enhe-admin-user-summary-card");
  });

  it("preserves user filtering, paging, identity fields, and detail links", () => {
    const list = read("app/admin/users/page.tsx");

    expect(list).toContain("parseAdminUserListParams");
    expect(list).toContain("buildAdminUserWhere");
    expect(list).toContain("buildAdminUserPageHref");
    expect(list).toContain('name="q"');
    expect(list).toContain('name="role"');
    expect(list).toContain('name="status"');
    expect(list).toContain("user.email");
    expect(list).toContain("user.phone");
    expect(list).toContain("/admin/users/${user.id}");
    expect(list).toContain("enhe-admin-user-records");
  });

  it("keeps protected account actions and does not add manual VIP controls", () => {
    const detail = read("app/admin/users/[id]/page.tsx");

    for (const action of ["updateUserAdminAction", "resetUserPasswordAction", "deleteUserAdminAction"]) {
      expect(detail).toContain(`action={${action}}`);
    }
    expect(detail).toContain("decideAdminUserHardDelete");
    expect(detail).toContain('name="confirmDelete"');
    expect(detail).not.toContain("adjustVipAdminAction");
    expect(detail).not.toContain("manualVip");
  });

  it("defines responsive, focus-visible user list and profile surfaces", () => {
    const shell = readRepo("src/styles/redesign/shell.css");
    for (const selector of [
      ".enhe-admin-users",
      ".enhe-admin-user-filter-form",
      ".enhe-admin-user-records",
      ".enhe-admin-user-summary-card",
      ".enhe-admin-user-danger-panel"
    ]) {
      expect(shell).toContain(selector);
    }
  });
});
