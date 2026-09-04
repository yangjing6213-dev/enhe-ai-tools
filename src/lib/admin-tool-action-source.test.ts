import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin tool action source", () => {
  it("accepts arbitrary download link content instead of requiring a URL prefix", () => {
    const source = readFileSync(join(process.cwd(), "src/app/admin/actions.ts"), "utf8");

    expect(source).toContain("function parseDownloadFileUrl");
    expect(source).toContain("return parseOptionalString(value);");
    expect(source).not.toContain("下载链接需以");
  });
});
