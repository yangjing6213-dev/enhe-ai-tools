import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
  tutorialFindMany: vi.fn(),
  toolCategoryFindMany: vi.fn()
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: db.toolFindMany
    },
    tutorial: {
      findMany: db.tutorialFindMany
    },
    toolCategory: {
      findMany: db.toolCategoryFindMany
    }
  }
}));

function buildOfflineError() {
  return Object.assign(new Error("Can't reach database server at `db:5432`"), { code: "P1001" });
}

describe("public content data access fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty public collections without querying Prisma when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    db.toolFindMany.mockResolvedValue([]);
    db.tutorialFindMany.mockResolvedValue([]);
    db.toolCategoryFindMany.mockResolvedValue([]);

    const { getPublicToolCategories, getPublicToolListing, getPublicTutorials } = await import("@/lib/public-content");

    await expect(getPublicToolListing("skill_learning")).resolves.toEqual([]);
    await expect(getPublicTutorials()).resolves.toEqual([]);
    await expect(getPublicToolCategories("skill_learning")).resolves.toEqual([]);
    expect({
      tool: db.toolFindMany.mock.calls.length,
      tutorial: db.tutorialFindMany.mock.calls.length,
      category: db.toolCategoryFindMany.mock.calls.length
    }).toEqual({ tool: 0, tutorial: 0, category: 0 });
  });

  it("returns empty public collections when Prisma cannot reach the database", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    db.toolFindMany.mockRejectedValue(buildOfflineError());
    db.tutorialFindMany.mockRejectedValue(buildOfflineError());
    db.toolCategoryFindMany.mockRejectedValue(buildOfflineError());

    const { getHomeRecommendedTools, getPublicToolCategories, getPublicToolListing, getPublicTutorials } = await import("@/lib/public-content");

    await expect(getHomeRecommendedTools()).resolves.toEqual([]);
    await expect(getPublicToolListing("software")).resolves.toEqual([]);
    await expect(getPublicTutorials()).resolves.toEqual([]);
    await expect(getPublicToolCategories("software")).resolves.toEqual([]);
  });

  it("preserves configured database reads", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    db.toolFindMany.mockResolvedValue([{ id: "tool-1" }]);
    db.tutorialFindMany.mockResolvedValue([{ id: "tutorial-1" }]);
    db.toolCategoryFindMany.mockResolvedValue([{ id: "category-1" }]);

    const { getPublicToolCategories, getPublicToolListing, getPublicTutorials } = await import("@/lib/public-content");

    await expect(getPublicToolListing("skill_learning")).resolves.toEqual([{ id: "tool-1" }]);
    await expect(getPublicTutorials()).resolves.toEqual([{ id: "tutorial-1" }]);
    await expect(getPublicToolCategories("skill_learning")).resolves.toEqual([{ id: "category-1" }]);
    expect(db.toolFindMany).toHaveBeenCalledOnce();
    expect(db.tutorialFindMany).toHaveBeenCalledOnce();
    expect(db.toolCategoryFindMany).toHaveBeenCalledOnce();
  });

  it("rethrows unexpected configured database failures", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    db.toolFindMany.mockRejectedValue(new Error("unexpected tool failure"));
    db.tutorialFindMany.mockRejectedValue(new Error("unexpected tutorial failure"));
    db.toolCategoryFindMany.mockRejectedValue(new Error("unexpected category failure"));

    const { getPublicToolCategories, getPublicToolListing, getPublicTutorials } = await import("@/lib/public-content");

    await expect(getPublicToolListing("skill_learning")).rejects.toThrow("unexpected tool failure");
    await expect(getPublicTutorials()).rejects.toThrow("unexpected tutorial failure");
    await expect(getPublicToolCategories("skill_learning")).rejects.toThrow("unexpected category failure");
  });
});
