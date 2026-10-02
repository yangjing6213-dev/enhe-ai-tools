import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const configPath = "../../next.config";

describe("admin visual Next.js config boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("SEO_AUDIT_TEST_DATABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:43295");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses an isolated output directory for a loopback, database-free preview", async () => {
    const { default: config } = await import(configPath);

    expect(config.distDir).toBe(".next-admin-visual");
    expect(config.outputFileTracingRoot).toBe(process.cwd());
  });

  it.each([
    ["production mode", "NODE_ENV", "production"],
    ["DATABASE_URL", "DATABASE_URL", "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test"],
    ["DIRECT_URL", "DIRECT_URL", "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test"],
    [
      "SEO_AUDIT_TEST_DATABASE_URL",
      "SEO_AUDIT_TEST_DATABASE_URL",
      "postgresql://fixture:fixture@127.0.0.1:5432/enhe_test",
    ],
    ["a non-loopback host", "NEXT_PUBLIC_APP_URL", "https://example.com"],
    ["a non-HTTP protocol", "NEXT_PUBLIC_APP_URL", "ftp://127.0.0.1"],
  ])("refuses to enable the preview with %s", async (_scenario, variable, value) => {
    vi.stubEnv(variable, value);

    await expect(import(configPath)).rejects.toThrow(
      "The admin visual fixture is limited to local database-free HTTP(S) development.",
    );
  });
});
