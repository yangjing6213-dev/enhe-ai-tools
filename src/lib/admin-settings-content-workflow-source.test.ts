import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/settings/page.tsx"), "utf8");

describe("admin settings presentation contract", () => {
  it("marks the create form, saved-setting list, and empty state for the shared light shell", () => {
    expect(pageSource).toContain("enhe-admin-settings");
    expect(pageSource).toContain("enhe-admin-settings-create-form");
    expect(pageSource).toContain("enhe-admin-settings-list");
    expect(pageSource).toContain("enhe-admin-settings-empty");
  });

  it("preserves the existing setting query, fields, and audited update action", () => {
    expect(pageSource).toContain('prisma.siteSetting.findMany({ orderBy: { key: "asc" } })');
    expect(pageSource).toContain("updateSiteSettingAction");
    expect(pageSource).toContain('name="key"');
    expect(pageSource).toContain('name="description"');
    expect(pageSource).toContain('name="value"');
    expect(pageSource).toContain("defaultValue={setting.value}");
  });
});
