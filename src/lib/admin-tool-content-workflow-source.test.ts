import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("admin tool content workflow presentation", () => {
  it("uses the shared content shell for every tool list and editor route", () => {
    const listRoutes = [
      "src/app/admin/software/page.tsx",
      "src/app/admin/online-tools/page.tsx",
      "src/app/admin/skill-learning/page.tsx",
      "src/app/admin/ai-skills/page.tsx"
    ];
    const editorRoutes = [
      "src/app/admin/software/[id]/page.tsx",
      "src/app/admin/online-tools/[id]/page.tsx",
      "src/app/admin/skill-learning/[id]/page.tsx",
      "src/app/admin/ai-skills/[id]/page.tsx"
    ];
    const component = readRepo("src/app/admin/tool-admin-list.tsx");

    expect(component).toContain("AdminContentShell");
    expect(component).toContain('className="enhe-admin-tool-workflow"');
    for (const route of listRoutes) {
      expect(readRepo(route)).toContain("ToolAdminList");
    }
    for (const route of editorRoutes) expect(readRepo(route)).toContain("ToolEditor");
  });

  it("marks the list toolbar, filter form, and scrollable table as shared surfaces", () => {
    const component = readRepo("src/app/admin/tool-admin-list.tsx");

    expect(component).toContain("enhe-admin-content-toolbar");
    expect(component).toContain("enhe-admin-tool-filter-form");
    expect(component).toContain("enhe-admin-content-table");
    expect(component).toContain("enhe-admin-tool-list-row");
  });

  it("keeps the editor forms on the same visual system without changing actions", () => {
    const component = readRepo("src/app/admin/tool-admin-list.tsx");
    const shell = readRepo("src/styles/redesign/shell.css");

    expect(component).toContain("enhe-admin-tool-editor-form");
    expect(component).toContain("action={upsertToolAction}");
    expect(component).toContain("action={deleteToolAction}");
    expect(component).toContain("ToolMediaUploadGuard");
    expect(component).toContain("ToolProductImageManager");
    expect(component).toContain("ToolVideoUploadField");
    expect(component).toContain("AiSkillPackageUploadField");
    expect(shell).toContain(".enhe-admin-tool-workflow");
    expect(shell).toContain(".enhe-admin-tool-table");
    expect(shell).toContain(".enhe-admin-tool-list-row:hover");
  });
});
