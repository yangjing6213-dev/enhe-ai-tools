import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/enhe_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves tool detail requests by raw or canonical slug", async () => {
    db.toolFindMany.mockResolvedValue([
      {
        id: "tool-1",
        slug: "ai-legacy",
        name: "AI语音生成",
        englishName: "AI Voice Generator - Flexible Edition"
      }
    ]);
    db.newsFindMany.mockResolvedValue([]);

    const { resolvePublicToolSlug } = await import("@/lib/public-content");

    await expect(resolvePublicToolSlug("ai-legacy")).resolves.toEqual({
      id: "tool-1",
      slug: "ai-legacy",
      canonicalSlug: "ai-voice-generator-flexible-edition"
    });
    await expect(resolvePublicToolSlug("ai-voice-generator-flexible-edition")).resolves.toEqual({
      id: "tool-1",
      slug: "ai-legacy",
      canonicalSlug: "ai-voice-generator-flexible-edition"
    });
  });

  it("resolves the protected voice tool URL after its title changes", async () => {
    const canonicalSlug = "local-ai-voice-generator-for-voiceover-materials";
    const tool = { id: "voice-tool", slug: "ai-ai", name: "本地 AI 语音生成", englishName: "Local AI Voice Generator | Windows Workspace for Narration and Multi-Character Audio" };
    db.toolFindMany.mockResolvedValue([tool]);
    const { resolvePublicToolSlug } = await import("@/lib/public-content");
    for (const slug of [tool.slug, canonicalSlug]) {
      await expect(resolvePublicToolSlug(slug)).resolves.toEqual({ id: tool.id, slug: tool.slug, canonicalSlug });
    }
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
