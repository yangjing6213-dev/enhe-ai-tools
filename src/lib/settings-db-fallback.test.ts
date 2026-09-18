import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findMany: vi.fn(),
  moduleLoads: 0
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn
}));

vi.mock("@/lib/db", () => {
  db.moduleLoads += 1;

  return {
    prisma: {
      siteSetting: {
        findMany: db.findMany
      }
    }
  };
});

describe("settings data access fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    db.moduleLoads = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([undefined, "", "   "])(
    "returns an empty settings map without loading Prisma when DATABASE_URL is %j",
    async (databaseUrl) => {
      vi.stubEnv("DATABASE_URL", databaseUrl);
      db.findMany.mockResolvedValue([]);

      const { getSettingsMap } = await import("@/lib/settings");

      await expect(getSettingsMap()).resolves.toEqual({});
      expect(db.moduleLoads).toBe(0);
      expect(db.findMany).not.toHaveBeenCalled();
    }
  );

  it("returns an empty settings map when Prisma cannot reach the database", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    const error = Object.assign(new Error("Can't reach database server at `db:5432`"), { code: "P1001" });
    db.findMany.mockRejectedValue(error);

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).resolves.toEqual({});
  });

  it("returns the settings map when Prisma responds normally", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    db.findMany.mockResolvedValue([{ key: "site_name", value: "ENHE" }]);

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).resolves.toEqual({ site_name: "ENHE" });
  });

  it("rethrows unexpected settings failures", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    db.findMany.mockRejectedValue(new Error("unexpected"));

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).rejects.toThrow("unexpected");
  });
});
