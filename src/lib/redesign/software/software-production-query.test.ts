import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
}));

const publicCache = vi.hoisted(() => new Map<string, unknown>());

vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => unknown,
    keyParts: readonly unknown[] = [],
  ) =>
    async (...args: unknown[]) => {
      const cacheKey = JSON.stringify([keyParts, args]);
      if (publicCache.has(cacheKey)) return publicCache.get(cacheKey);

      const result = await fn(...args);
      publicCache.set(cacheKey, result);
      return result;
    },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: { findMany: db.toolFindMany },
  },
}));

describe("production software public query", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    publicCache.clear();
    vi.stubEnv("DATABASE_URL", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("selects published Tool data without file or delivery fields", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    db.toolFindMany.mockResolvedValue([]);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await getPublicSoftwareCatalogRows();

    expect(db.toolFindMany).toHaveBeenCalledOnce();
    const query = db.toolFindMany.mock.calls[0]?.[0];
    expect(query.where).toEqual({ status: "published", type: "software" });
    expect(query.select).toMatchObject({
      id: true,
      slug: true,
      name: true,
      englishName: true,
      type: true,
      shortDescription: true,
      content: true,
      coverImage: true,
      isDownloadPaid: true,
      downloadPrice: true,
      isHomeRecommended: true,
      sortOrder: true,
      createdAt: true,
      category: { select: { name: true } },
    });
    expect(JSON.stringify(query.select)).not.toMatch(
      /fileUrl|filePath|files|downloadFile|onlineUrl|orders|purchases|objectKey/i,
    );
  });

  it("does not turn a database outage into a cached empty catalog", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    const outage = Object.assign(new Error("Can't reach database server"), {
      code: "P1001",
    });
    db.toolFindMany.mockRejectedValue(outage);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).rejects.toBe(outage);
  });

  it("returns an empty catalog without querying Prisma when DATABASE_URL is unset", async () => {
    db.toolFindMany.mockResolvedValue([]);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).resolves.toEqual([]);
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });

  it("does not reuse configured catalog rows after returning to DB-free mode", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    db.toolFindMany.mockResolvedValue([{ id: "configured-software" }]);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).resolves.toEqual([
      { id: "configured-software" },
    ]);

    vi.unstubAllEnvs();

    await expect(getPublicSoftwareCatalogRows()).resolves.toEqual([]);
    expect(db.toolFindMany).toHaveBeenCalledOnce();
  });

  it("uses a lightweight cached projection for public catalog covers", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    db.toolFindMany.mockResolvedValue([]);
    const { getPublicSoftwareCatalogCovers } = await import("@/lib/public-content");

    await getPublicSoftwareCatalogCovers();

    expect(db.toolFindMany).toHaveBeenCalledOnce();
    const query = db.toolFindMany.mock.calls[0]?.[0];
    expect(query.where).toEqual({ status: "published", type: "software" });
    expect(query.select).toEqual({ id: true, coverImage: true });
  });

  it("returns no catalog covers without querying Prisma when DATABASE_URL is unset", async () => {
    db.toolFindMany.mockResolvedValue([{ id: "unexpected-cover" }]);
    const { getPublicSoftwareCatalogCovers } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogCovers()).resolves.toEqual([]);
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });
});
