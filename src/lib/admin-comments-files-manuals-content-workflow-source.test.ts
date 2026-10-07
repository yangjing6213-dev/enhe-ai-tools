import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
const readRepo = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("comments, files, and operation-manual admin presentation", () => {
  it("mounts each route in the shared light management shell", () => {
    for (const route of ["app/admin/comments/page.tsx", "app/admin/files/page.tsx", "app/admin/manuals/page.tsx"]) {
      const source = read(route);
      expect(source).toContain("AdminContentShell");
      expect(source).toContain("enhe-admin-content-management");
    }
  });

  it("preserves comment moderation, file operations, and read-only manuals", () => {
    const comments = read("app/admin/comments/page.tsx");
    const files = read("app/admin/files/page.tsx");
    const manuals = read("app/admin/manuals/page.tsx");

    expect(comments).toContain("buildAdminCommentWhere");
    expect(comments).toContain("updateCommentStatusAction");
    expect(comments).toContain("updateCommentPinAction");
    for (const status of ["approved", "rejected", "deleted"]) {
      expect(comments).toContain(`status=\"${status}\"`);
    }
    expect(files).toContain("getStorageDiagnostics");
    expect(files).toContain("AdminFileUploadForm");
    expect(files).toContain("action={upsertFileAction}");
    expect(files).toContain("action={deleteFileAdminAction}");
    for (const name of ["fileName", "toolId", "filePath", "fileUrl", "version", "mimeType", "fileSize"]) {
      expect(files).toContain(`name=\"${name}\"`);
    }
    expect(manuals).toContain("operationManuals.map");
    expect(manuals).toContain("/admin/manuals/view/${manual.slug}");
  });

  it("provides responsive comment, upload, file, and manual surfaces", () => {
    const comments = read("app/admin/comments/page.tsx");
    const files = read("app/admin/files/page.tsx");
    const manuals = read("app/admin/manuals/page.tsx");
    const shell = readRepo("src/styles/redesign/shell.css");

    expect(comments).toContain("enhe-admin-comment-filter-form");
    expect(comments).toContain("enhe-admin-comment-card");
    expect(files).toContain("enhe-admin-file-upload-panel");
    expect(files).toContain("enhe-admin-file-filter-form");
    expect(files).toContain("enhe-admin-file-card");
    expect(manuals).toContain("enhe-admin-manual-card");
    for (const selector of [
      ".enhe-admin-comments",
      ".enhe-admin-comment-card",
      ".enhe-admin-file-upload-panel",
      ".enhe-admin-file-card",
      ".enhe-admin-manual-card"
    ]) {
      expect(shell).toContain(selector);
    }
  });
});
