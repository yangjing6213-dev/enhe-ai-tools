import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("admin product image storage", () => {
  it("stores new product images through the shared storage layer", () => {
    const actions = readFileSync(resolve(root, "src/app/admin/actions.ts"), "utf8");
    const helper = actions.slice(actions.indexOf("async function saveAdminImageUpload"), actions.indexOf("async function saveAdminImageUploads"));

    expect(helper).toContain("saveUploadedFile(file");
    expect(helper).toContain("folder: prefix");
    expect(helper).toContain('return stored.storage === "cos" ? stored.filePath : stored.fileUrl');
    expect(helper).not.toContain("writeFile(");
  });
});
