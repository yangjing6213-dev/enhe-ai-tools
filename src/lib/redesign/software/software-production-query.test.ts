import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
  getSecureCosMediaUrl: vi.fn(),
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

vi.mock("@/lib/storage", () => ({
  getSecureCosMediaUrl: db.getSecureCosMediaUrl,
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
    vi.unstubAllGlobals();
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
      securityReviewedAt: true,
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
    expect(query.where).toEqual({
      status: "published",
      type: { in: ["software", "ai_skill"] },
    });
    expect(query.select).toEqual({ id: true, coverImage: true });
  });

  it("serves uploaded AI Skill and software covers while keeping unpublished products private", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    const products = [
      { id: "public-skill", type: "ai_skill", status: "published" },
      { id: "public-software", type: "software", status: "published" },
      { id: "draft-skill", type: "ai_skill", status: "draft" },
      { id: "draft-software", type: "software", status: "draft" },
      { id: "other-product", type: "online", status: "published" },
    ].map((product) => ({
      ...product,
      coverImage: `cos://enhe-bucket/tool-cover-${product.id}/cover.png`,
    }));
    db.toolFindMany.mockImplementation(async ({ where }) => products
      .filter((product) => product.status === where.status && (
        typeof where.type === "string"
          ? product.type === where.type
          : where.type.in.includes(product.type)
      ))
      .map(({ id, coverImage }) => ({ id, coverImage })));
    db.getSecureCosMediaUrl.mockResolvedValue("https://signed.example/cover.png");
    const imageBytes = new Uint8Array([137, 80, 78, 71]);
    const fetchImage = vi.fn().mockImplementation(async () => new Response(imageBytes, {
      headers: { "content-type": "image/png" },
    }));
    vi.stubGlobal("fetch", fetchImage);
    const { GET } = await import("@/app/api/tool-images/route");

    for (const product of products) {
      const response = await GET(new Request(
        `https://www.enhe-tech.com.cn/api/tool-images?id=${product.id}&mode=optimizer-source`,
      ));
      const isPublicCatalogProduct = product.id.startsWith("public-");
      expect(response.status, product.id).toBe(isPublicCatalogProduct ? 200 : 404);
      if (isPublicCatalogProduct) {
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(imageBytes);
        expect(db.getSecureCosMediaUrl).toHaveBeenCalledWith(product.coverImage);
      }
    }

    expect(db.toolFindMany).toHaveBeenCalledOnce();
    expect(db.getSecureCosMediaUrl).toHaveBeenCalledTimes(2);
    expect(fetchImage).toHaveBeenCalledTimes(2);
  });

  it("returns no catalog covers without querying Prisma when DATABASE_URL is unset", async () => {
    db.toolFindMany.mockResolvedValue([{ id: "unexpected-cover" }]);
    const { getPublicSoftwareCatalogCovers } = await import("@/lib/public-content");

    await expect(getPublicSoftwareCatalogCovers()).resolves.toEqual([]);
    expect(db.toolFindMany).not.toHaveBeenCalled();
  });
});
