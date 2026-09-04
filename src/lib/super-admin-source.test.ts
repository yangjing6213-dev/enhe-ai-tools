import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("super admin provisioning", () => {
  it("provisions Sadmin without committing the plaintext password", () => {
    const script = readFileSync(new URL("../../prisma/ensure-super-admin.js", import.meta.url), "utf8");

    expect(script).toContain('"Sadmin"');
    expect(script).toContain("passwordHash");
    expect(script).not.toMatch(/password\s*[:=]\s*["']/i);
  });

  it("runs the super admin provisioner during Tencent Cloud container startup", () => {
    const entrypoint = readFileSync(new URL("../../deploy/enhe-ai-tools/scripts/app-entrypoint.sh", import.meta.url), "utf8");

    expect(entrypoint).toContain("cd /app");
    expect(entrypoint).toContain("node prisma/ensure-super-admin.js");
  });
});
