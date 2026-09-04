import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  findMany: vi.fn()
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSetting: {
      findMany: db.findMany
    }
  }
}));

describe("settings data access fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns an empty settings map when Prisma cannot reach the database", async () => {
    const error = Object.assign(new Error("Can't reach database server at `db:5432`"), { code: "P1001" });
    db.findMany.mockRejectedValue(error);

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).resolves.toEqual({});
  });

  it("returns the settings map when Prisma responds normally", async () => {
    db.findMany.mockResolvedValue([{ key: "site_name", value: "ENHE" }]);

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).resolves.toEqual({ site_name: "ENHE" });
  });

  it("rethrows unexpected settings failures", async () => {
    db.findMany.mockRejectedValue(new Error("unexpected"));

    const { getSettingsMap } = await import("@/lib/settings");

    await expect(getSettingsMap()).rejects.toThrow("unexpected");
  });
});
