import { afterEach, describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/db", () => ({ prisma: { tool: { findMany } } }));
import { getPublicSearchRecommendations } from "./public-search-recommendations";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); findMany.mockReset(); });

describe("header download recommendations", () => {
  it("requests only the five most downloaded published downloadable products with stable ties", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    findMany.mockResolvedValue([
      { id: "tool-1", slug: "test-tool", name: "测试工具", englishName: "Test Tool", type: "software", downloadCount: 12, category: { name: "效率工具" } },
      { id: "skill-1", slug: "test-skill", name: "测试技能", englishName: "Test Skill", type: "ai_skill", downloadCount: 8, category: null },
    ]);
    const result = await getPublicSearchRecommendations("en");
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "published", type: { in: ["software", "ai_skill"] }, downloadCount: { gt: 0 } },
      select: { id: true, slug: true, name: true, englishName: true, type: true, downloadCount: true, category: { select: { name: true } } },
      orderBy: [{ downloadCount: "desc" }, { id: "asc" }], take: 5,
    });
    expect(result.map(({ title, href, downloadCount }) => ({ title, href, downloadCount }))).toEqual([
      { title: "Test Tool", href: "/en/software/test-tool", downloadCount: 12 },
      { title: "Test Skill", href: "/en/ai-skills/test-skill", downloadCount: 8 },
    ]);
    expect((await getPublicSearchRecommendations("zh"))[0]).toMatchObject({ title: "测试工具", href: "/software/test-tool", category: "效率工具" });
  });

  it("does not invent recommendations without a database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(await getPublicSearchRecommendations("zh")).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("keeps navigation usable on read failure without logging connection details", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/enhe-test");
    findMany.mockRejectedValue(new Error("private database detail"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getPublicSearchRecommendations("zh")).toEqual([]);
    expect(log).toHaveBeenCalledWith("[header-search] Download recommendations are temporarily unavailable.");
  });
});
