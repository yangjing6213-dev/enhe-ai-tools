import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  newsArticleFindMany: vi.fn(),
  newsArticleFindFirst: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    newsArticle: {
      findMany: db.newsArticleFindMany,
      findFirst: db.newsArticleFindFirst,
    },
  },
}));

const root = join(process.cwd(), "src");

function read(relativePath: string) {
  const path = join(root, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("AI News detail DB-free boundary", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("short-circuits article slug and article reads without DATABASE_URL", async () => {
    const { getPublicNewsArticleBySlug, resolvePublicNewsArticleSlug } =
      await import("@/lib/public-content");

    await expect(resolvePublicNewsArticleSlug("db-free-probe")).resolves.toBeNull();
    await expect(getPublicNewsArticleBySlug("db-free-probe")).resolves.toBeNull();
    expect(db.newsArticleFindMany).not.toHaveBeenCalled();
    expect(db.newsArticleFindFirst).not.toHaveBeenCalled();
  });

  it("declares an unverified noindex metadata boundary for the unavailable detail route", () => {
    const page = read("app/ai-news/[slug]/page-shell.tsx");

    expect(page).toContain("if (!process.env.DATABASE_URL?.trim())");
    expect(page).toContain("t.aiNews.dbFreeDetailMetaDescription");
    expect(page).toContain("index: false");
    expect(page).toContain("follow: true");
  });

  it("mounts configured detail content in the AI News light-token scope", () => {
    const page = read("app/ai-news/[slug]/page-shell.tsx");

    expect(page).toContain(
      '<main className="ai-news-page ai-news-workspace enhe-reference-workspace ai-news-detail-page">',
    );
    expect(page).not.toContain("radial-gradient");
    expect(page).not.toContain("border-white");
    expect(page).not.toContain("bg-white");
    expect(page).toContain("bg-[#05070B]");
    expect(page).toContain("text-[#C5D0E2]");
  });
});
