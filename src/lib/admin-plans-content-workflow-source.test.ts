import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/plans/page.tsx"), "utf8");

describe("admin plans disabled-state presentation contract", () => {
  it("marks the disabled notice for the shared light shell", () => {
    expect(pageSource).toContain("enhe-admin-plans");
    expect(pageSource).toContain("enhe-admin-plans-disabled-card");
  });

  it("keeps plan sales disabled and routes paid-product work to the existing tools page", () => {
    expect(pageSource).toContain('title: "套餐功能已停用"');
    expect(pageSource).toContain('title: "Plans are disabled"');
    expect(pageSource).toContain('href="/admin/software"');
    expect(pageSource).not.toContain("<form");
  });
});
