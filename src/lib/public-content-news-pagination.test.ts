import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  newsFindMany: vi.fn(),
  newsCount: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => {
    const cache = new Map<string, unknown>();
    return (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (!cache.has(key)) {
        cache.set(
          key,
          Promise.resolve(fn(...args)).then((result) =>
            JSON.parse(JSON.stringify(result)),
          ),
        );
      }
      return cache.get(key);
    };
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    newsArticle: {
      findMany: db.newsFindMany,
      count: db.newsCount,
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

function buildArticle(index: number) {
  return {
    id: `news-${index}`,
    slug: `news-${index}`,
    title: `AI workflow update ${index}`,
    summary: `The practical impact of workflow update ${index}.`,
    content: `The complete article about workflow update ${index}.`,
    publishedAt: new Date("2026-10-11T00:00:00.000Z"),
    createdAt: new Date("2026-10-11T00:00:00.000Z"),
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

describe("public news deduplication and stable pagination", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("removes exact title, summary and content copies before counting and slicing, retaining the original slug", async () => {
    const original = { ...buildArticle(1), slug: "workflow-launch" };
    const duplicate = {
      ...original,
      id: "duplicate-first",
      slug: "workflow-launch-2",
    };
    const sameTitleDifferentBody = {
      ...original,
      id: "different-body",
      slug: "workflow-follow-up",
      content: "A different article about the same launch.",
    };
    const sameTitleDifferentSummary = {
      ...original,
      id: "different-summary",
      slug: "workflow-new-summary",
      summary: "A different editorial summary.",
    };
    db.newsFindMany.mockResolvedValue([
      duplicate,
      ...Array.from({ length: 9 }, (_, index) => buildArticle(index + 2)),
      original,
      sameTitleDifferentBody,
      sameTitleDifferentSummary,
    ]);
    db.newsCount.mockResolvedValue(13);

    const { getPublicNewsListing } = await import("@/lib/public-content");
    const first = await getPublicNewsListing({ locale: "zh", take: 9 });
    const second = await getPublicNewsListing({ locale: "zh", take: 9, skip: 9 });

    expect(first.total).toBe(12);
    expect(second.total).toBe(12);
    expect(first.articles[0]).toMatchObject({
      id: original.id,
      slug: original.slug,
    });
    expect(first.articles[0]).not.toHaveProperty("content");
    expect(first.articles[0]).not.toHaveProperty("englishContent");
    expect(second.articles.map((article) => article.id)).toEqual([
      "news-10",
      "different-body",
      "different-summary",
    ]);
    expect(
      new Set([...first.articles, ...second.articles].map((article) => article.id)).size,
    ).toBe(12);
  });

  it.each(["latest", "hot", "featured"] as const)(
    "uses a unique final ordering key for %s",
    async (sort) => {
      db.newsFindMany.mockResolvedValue([buildArticle(1)]);
      const { getPublicNewsListing } = await import("@/lib/public-content");
      await getPublicNewsListing({ locale: "zh", sort });
      expect(db.newsFindMany.mock.calls[0]?.[0].orderBy.at(-1)).toEqual({
        id: "asc",
      });
    },
  );

  it("uses the same cached list for adjacent pages even when the database changes between requests", async () => {
    const articles = Array.from({ length: 12 }, (_, index) =>
      buildArticle(index + 1),
    );
    db.newsFindMany.mockResolvedValue(articles);
    db.newsCount.mockResolvedValue(12);
    const { getPublicNewsListing } = await import("@/lib/public-content");
    const first = await getPublicNewsListing({
      locale: "zh",
      sort: "latest",
      take: 9,
    });
    db.newsFindMany.mockResolvedValue([buildArticle(99), ...articles]);
    db.newsCount.mockResolvedValue(13);
    const second = await getPublicNewsListing({
      locale: "zh",
      sort: "latest",
      skip: 9,
      take: 9,
    });

    expect(db.newsFindMany).toHaveBeenCalledTimes(1);
    expect(second.total).toBe(first.total);
    expect(new Date(second.articles[0].publishedAt!).toISOString()).toBe(
      "2026-10-11T00:00:00.000Z",
    );
    expect(second.articles.map((article) => article.id)).toEqual([
      "news-10",
      "news-11",
      "news-12",
    ]);
    expect(
      second.articles.some((article) =>
        first.articles.some((previous) => previous.id === article.id),
      ),
    ).toBe(false);
  });

  it("keeps English visibility rules before removing identical article copies", async () => {
    const original = {
      ...buildArticle(1),
      ...buildEnglishArticle(1, false),
      slug: "english-launch",
    };
    const visibleCopy = {
      ...original,
      ...buildEnglishArticle(1, true),
      id: "translated-copy",
      slug: "english-launch-2",
    };
    db.newsFindMany.mockResolvedValue([original, visibleCopy]);
    const { getPublicNewsListing } = await import("@/lib/public-content");
    const result = await getPublicNewsListing({ locale: "en" });
    expect(result.total).toBe(1);
    expect(result.articles[0]?.id).toBe("translated-copy");

    const chinese = await getPublicNewsListing({ locale: "zh" });
    expect(chinese.total).toBe(2);
    expect(chinese.articles[0]?.id).toBe(original.id);
    expect(db.newsFindMany).toHaveBeenCalledTimes(2);
  });

  it("preserves separate translations, categories and tags for otherwise identical Chinese articles", async () => {
    const original = {
      ...buildArticle(1),
      categoryId: "category-one",
      tagLinks: [{ tag: { id: "tag-one" } }],
      englishTitle: "A workflow update",
    };
    db.newsFindMany.mockResolvedValue([
      original,
      {
        ...original,
        id: "new-translation",
        slug: "translated-workflow",
        englishTitle: "A different English title",
      },
      {
        ...original,
        id: "new-category",
        slug: "categorized-workflow",
        categoryId: "category-two",
      },
      {
        ...original,
        id: "new-tag",
        slug: "tagged-workflow",
        tagLinks: [{ tag: { id: "tag-two" } }],
      },
    ]);
    const { getPublicNewsListing } = await import("@/lib/public-content");
    const result = await getPublicNewsListing({ locale: "zh" });
    expect(result.total).toBe(4);
  });

  it("returns an empty listing without a database and on a recoverable database read failure", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getPublicNewsListing } = await import("@/lib/public-content");
    await expect(getPublicNewsListing({ locale: "zh" })).resolves.toEqual({
      articles: [],
      total: 0,
    });
    expect(db.newsFindMany).not.toHaveBeenCalled();
    vi.stubEnv("DATABASE_URL", "postgresql://configured.invalid/enhe");
    db.newsFindMany.mockRejectedValue(
      Object.assign(new Error("Can't reach database server"), { code: "P1001" }),
    );
    await expect(getPublicNewsListing({ locale: "zh" })).resolves.toEqual({
      articles: [],
      total: 0,
    });
  });
});
