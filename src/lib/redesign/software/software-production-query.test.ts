import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
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
  });

  it("selects published Tool data without file or delivery fields", async () => {
    db.toolFindMany.mockResolvedValue([]);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await getPublicSoftwareCatalogRows();

    expect(db.toolFindMany).toHaveBeenCalledOnce();
    const query = db.toolFindMany.mock.calls[0]?.[0];
    expect(query.where).toMatchObject({ status: "published" });
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
    const outage = Object.assign(new Error("Can't reach database server"), {
      code: "P1001",
    });
    db.toolFindMany.mockRejectedValue(outage);
    const { getPublicSoftwareCatalogRows } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogRows()).rejects.toBe(outage);
  });

  it("uses a lightweight cached projection for public catalog covers", async () => {
    db.toolFindMany.mockResolvedValue([]);
    const { getPublicSoftwareCatalogCovers } = await import("@/lib/public-content");

    await getPublicSoftwareCatalogCovers();

    expect(db.toolFindMany).toHaveBeenCalledOnce();
    const query = db.toolFindMany.mock.calls[0]?.[0];
    expect(query.where).toMatchObject({ status: "published" });
    expect(query.select).toEqual({ id: true, coverImage: true });
  });
});
