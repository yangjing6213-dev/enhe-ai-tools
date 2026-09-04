import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("returns empty public collections when Prisma cannot reach the database", async () => {
    db.toolFindMany.mockRejectedValue(buildOfflineError());
    db.tutorialFindMany.mockRejectedValue(buildOfflineError());
    db.toolCategoryFindMany.mockRejectedValue(buildOfflineError());

    const { getHomeRecommendedTools, getPublicToolCategories, getPublicToolListing, getPublicTutorials } = await import("@/lib/public-content");

    await expect(getHomeRecommendedTools()).resolves.toEqual([]);
    await expect(getPublicToolListing("software")).resolves.toEqual([]);
    await expect(getPublicTutorials()).resolves.toEqual([]);
    await expect(getPublicToolCategories("software")).resolves.toEqual([]);
  });
});
