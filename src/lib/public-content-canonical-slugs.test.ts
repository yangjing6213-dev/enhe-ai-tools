import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toolFindMany: vi.fn(),
  newsFindMany: vi.fn()
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tool: {
      findMany: db.toolFindMany
    },
    newsArticle: {
      findMany: db.newsFindMany
    }
  }
}));

describe("public content canonical slug resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("resolves tool detail requests by raw or canonical slug", async () => {
    db.toolFindMany.mockResolvedValue([
      {
        id: "tool-1",
        slug: "ai-ai",
        name: "AI语音生成",
        englishName: "AI Voice Generator - Flexible Edition"
      }
    ]);
    db.newsFindMany.mockResolvedValue([]);

    const { resolvePublicToolSlug } = await import("@/lib/public-content");

    await expect(resolvePublicToolSlug("ai-ai")).resolves.toEqual({
      id: "tool-1",
      slug: "ai-ai",
      canonicalSlug: "ai-voice-generator-flexible-edition"
    });
    await expect(resolvePublicToolSlug("ai-voice-generator-flexible-edition")).resolves.toEqual({
      id: "tool-1",
      slug: "ai-ai",
      canonicalSlug: "ai-voice-generator-flexible-edition"
    });
  });

  it("resolves AI news detail requests by raw or canonical slug", async () => {
    db.toolFindMany.mockResolvedValue([]);
    db.newsFindMany.mockResolvedValue([
      {
        id: "news-1",
        slug: "ai-news-trend-insights-launch",
        title: "中文标题",
        englishTitle: "OpenAI Agent Workflow Update"
      }
    ]);

    const { resolvePublicNewsArticleSlug } = await import("@/lib/public-content");

    await expect(resolvePublicNewsArticleSlug("ai-news-trend-insights-launch")).resolves.toEqual({
      id: "news-1",
      slug: "ai-news-trend-insights-launch",
      canonicalSlug: "openai-agent-workflow-update"
    });
    await expect(resolvePublicNewsArticleSlug("openai-agent-workflow-update")).resolves.toEqual({
      id: "news-1",
      slug: "ai-news-trend-insights-launch",
      canonicalSlug: "openai-agent-workflow-update"
    });
  });
});
