import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({ tool: { count: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));

import { generateAiWorkflowsPageMetadata } from "./page-shell";

describe("AI workflow directory metadata", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://test.local/workflows");
    prismaMock.tool.count.mockReset().mockResolvedValue(25);
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["zh", "https://www.enhe-tech.com.cn/ai-workflows"],
    ["en", "https://www.enhe-tech.com.cn/en/ai-workflows"],
  ] as const)("keeps the unfiltered %s directory indexable", async (locale, canonical) => {
    const metadata = await generateAiWorkflowsPageMetadata(locale);
    expect(metadata.robots).not.toMatchObject({ index: false });
    expect(metadata.alternates?.canonical).toBe(canonical);
  });

  it.each(["q", "topic", "paid", "environment", "type", "sort"])("marks a %s query noindex and omits it from canonical", async (key) => {
    const metadata = await generateAiWorkflowsPageMetadata("zh", { [key]: key === "sort" ? "unknown" : "private-query" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://www.enhe-tech.com.cn/ai-workflows");
    expect(metadata.alternates?.canonical).not.toContain("private-query");
  });

  it.each([
    ["2", "https://www.enhe-tech.com.cn/ai-workflows?page=2"],
    ["999", "https://www.enhe-tech.com.cn/ai-workflows?page=3"],
  ])("uses the effective paginated canonical for page=%s", async (page, canonical) => {
    const metadata = await generateAiWorkflowsPageMetadata("zh", { page });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(canonical);
  });

  it.each(["1", "-3", "0", "NaN", ""])("normalizes page=%s to the base canonical", async (page) => {
    const metadata = await generateAiWorkflowsPageMetadata("zh", { page });
    expect(metadata.robots).not.toMatchObject({ index: false });
    expect(metadata.alternates?.canonical).toBe("https://www.enhe-tech.com.cn/ai-workflows");
  });

  it("uses the first repeated value for rendering and metadata", async () => {
    const metadata = await generateAiWorkflowsPageMetadata("en", { q: ["first", "private-second"] });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://www.enhe-tech.com.cn/en/ai-workflows");
    expect(metadata.alternates?.canonical).not.toContain("private-second");
  });

  it("marks an unconnected local preview noindex without claiming the production catalog is empty", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const metadata = await generateAiWorkflowsPageMetadata("en", { page: "4" });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://www.enhe-tech.com.cn/en/ai-workflows");
    expect(prismaMock.tool.count).not.toHaveBeenCalled();
  });

  it("keeps an unfiltered preview noindex if its content count cannot be verified", async () => {
    prismaMock.tool.count.mockRejectedValue(new Error("isolated database unavailable"));
    const metadata = await generateAiWorkflowsPageMetadata("zh");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
