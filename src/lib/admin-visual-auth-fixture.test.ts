import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixturePath = "../../tests/fixtures/admin-visual-auth";

describe("read-only admin auth fixture", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE", "1");
    vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE_HOST", "127.0.0.1");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "assertLoginNotLimited", "recordLoginAttempt", "requireUser",
    "signInUser", "signOutUser", "verifyPassword", "hashPassword"
  ])("exports %s but refuses authentication or user operations", async (name) => {
    const fixture = await import(fixturePath) as Record<string, unknown>;
    expect(typeof fixture[name]).toBe("function");
    await expect((fixture[name] as () => Promise<never>)()).rejects.toThrow(/disabled in the admin visual fixture/);
  });

  it.each([
    ["ENHE_ADMIN_VISUAL_FIXTURE", "0"],
    ["NODE_ENV", "production"],
    ["DATABASE_URL", "postgresql://fixture.invalid/test-only"]
  ])("refuses loading when %s leaves the isolated development boundary", async (key, value) => {
    vi.stubEnv(key, value);
    await expect(import(fixturePath)).rejects.toThrow("available only in local database-free development");
  });

  it.each(["", "0.0.0.0", "::1"])(
    "refuses loading without the approved loopback launcher marker (%s)",
    async (host) => {
      vi.stubEnv("ENHE_ADMIN_VISUAL_FIXTURE_HOST", host);
      await expect(import(fixturePath)).rejects.toThrow(
        "available only in local database-free development",
      );
    },
  );

  it("retains only the synthetic admin read identity", async () => {
    const fixture = await import(fixturePath);
    await expect(fixture.requireAdmin()).resolves.toMatchObject({ id: "local-visual-admin", role: "admin" });
  });
});
