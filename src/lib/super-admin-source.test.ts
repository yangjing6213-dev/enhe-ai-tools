import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("super admin provisioning", () => {
  it("requires explicit environment input without committing an administrator credential", () => {
    const script = readFileSync(new URL("../../prisma/ensure-super-admin.js", import.meta.url), "utf8");

    expect(script).toContain("ADMIN_BOOTSTRAP_EMAIL");
    expect(script).toContain("ADMIN_BOOTSTRAP_PASSWORD");
    expect(script).toContain("ADMIN_BOOTSTRAP_CONFIRM");
    expect(script).toContain('confirmation !== "CREATE_ENHE_ADMIN"');
    expect(script).toContain("bcrypt.hash(password, 12)");
    expect(script).toContain("passwordHash");
    expect(script).not.toContain('"Sadmin"');
    expect(script).not.toMatch(/\$2[aby]\$/);
    expect(script).not.toMatch(/password\s*[:=]\s*["']/i);
  });

  it("runs the provisioner only through the explicit Tencent Cloud admin command", () => {
    const entrypoint = readFileSync(new URL("../../deploy/enhe-ai-tools/scripts/app-entrypoint.sh", import.meta.url), "utf8");
    const initAdmin = readFileSync(new URL("../../deploy/enhe-ai-tools/scripts/enhe-init-admin.sh", import.meta.url), "utf8");

    expect(entrypoint).toContain("cd /app");
    expect(entrypoint).not.toContain("node prisma/ensure-super-admin.js");
    expect(initAdmin).toContain("ADMIN_BOOTSTRAP_CONFIRM");
    expect(initAdmin).toContain("app node prisma/ensure-super-admin.js");
  });
});
