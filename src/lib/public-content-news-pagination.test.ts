import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  newsFindMany: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    newsArticle: {
      findMany: db.newsFindMany,
    },
  },
}));

function buildEnglishArticle(index: number, indexable: boolean) {
  return {
    id: `news-${index}`,
    slug: `news-${index}`,
    englishTitle: indexable ? `Practical AI workflow update ${index}` : "",
    englishSummary: indexable
      ? "A complete English summary explaining practical workflow impact."
      : "",
    englishContent: indexable
      ? "This English article explains the workflow change, why it matters, and the practical next steps that AI users can apply to daily work. ".repeat(
          3,
        )
      : "",
  };
}

describe("public English AI news pagination", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("counts and paginates all indexable English articles beyond the first 80 candidates", async () => {
    const articles = [
      ...Array.from({ length: 80 }, (_, index) =>
        buildEnglishArticle(index + 1, false),
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        buildEnglishArticle(index + 81, true),
      ),
    ];
    db.newsFindMany.mockImplementation(
      async ({ take }: { take?: number }) =>
        typeof take === "number" ? articles.slice(0, take) : articles,
    );

    const { getPublicNewsListing } = await import("@/lib/public-content");
    const result = await getPublicNewsListing({
      locale: "en",
      sort: "latest",
      skip: 9,
      take: 9,
    });

    expect(result.total).toBe(10);
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.id).toBe("news-90");
    expect(db.newsFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ take: expect.any(Number) }),
    );
  });
});
