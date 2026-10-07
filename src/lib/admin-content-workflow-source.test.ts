import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("admin content workflow shell source contract", () => {
  it("exports shared content workflow primitives", () => {
    const ui = read("app/admin/admin-ui.tsx");

    expect(ui).toContain("export function AdminContentShell");
    expect(ui).toContain("export function AdminProvenanceNotice");
    expect(ui).toContain("enhe-admin-content-shell");
    expect(ui).toContain("enhe-admin-provenance-note");
  });

  it("mounts the shared shell and provenance gate on AI News workflows", () => {
    const pages = [
      read("app/admin/ai-news/page.tsx"),
      read("app/admin/ai-news/[id]/page.tsx"),
      read("app/admin/ai-news/import/page.tsx")
    ];

    for (const page of pages) {
      expect(page).toContain("AdminContentShell");
      expect(page).toContain("AdminProvenanceNotice");
      expect(page).toContain("首方");
    }
  });

  it("defines responsive content workflow and evidence-gate styling", () => {
    const shell = readRepo("src/styles/redesign/shell.css");

    expect(shell).toContain(".enhe-admin-content-shell");
    expect(shell).toContain(".enhe-admin-content-toolbar");
    expect(shell).toContain(".enhe-admin-content-table");
    expect(shell).toContain(".enhe-admin-provenance-note");
    expect(shell).toContain("@media (forced-colors: active)");
  });
});
