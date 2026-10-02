import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readAdminPage = (path: string) =>
  readFileSync(new URL(`../app/admin/${path}`, import.meta.url), "utf8");

describe("empty-tool guidance on content editors", () => {
  it.each([
    ["FAQ", "faqs/[id]/page.tsx", "upsertToolFaqAction"],
    ["tutorial", "tutorials/[id]/page.tsx", "upsertTutorialAction"],
    ["changelog", "changelogs/[id]/page.tsx", "upsertToolChangelogAction"]
  ])("explains how to add a tool on the empty %s editor", (_name, path, action) => {
    const source = readAdminPage(path);

    expect(source).toContain("tools.length === 0");
    expect(source).toContain("当前还没有可关联的 AI 软件应用");
    expect(source).toContain('<Link href="/admin/software/new"');
    expect(source).toContain(`action={${action}}`);
    expect(source).toContain('name="toolId"');
    expect(source).toMatch(/name="toolId"[^>]*required/);
  });
});
