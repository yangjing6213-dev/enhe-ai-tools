import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicToolSearchWhere,
  normalizePublicSearchQuery,
  searchPublicContent,
} from "@/lib/public-search";

const prismaMock = vi.hoisted(() => ({
  tool: { findMany: vi.fn() },
  newsArticle: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

describe("public search", () => {
  beforeEach(() => {
    prismaMock.tool.findMany.mockReset();
    prismaMock.newsArticle.findMany.mockReset();
  });

  it("normalizes untrusted query input", () => {
    expect(normalizePublicSearchQuery("  voice\u0000  generator\n ")).toBe(
      "voice generator",
    );
    expect(normalizePublicSearchQuery("x".repeat(120))).toHaveLength(80);
  });

  it("indexes product names, category, summary, and body copy", () => {
    const where = JSON.stringify(buildPublicToolSearchWhere("voice"));

    expect(where).toContain('"name"');
    expect(where).toContain('"englishName"');
    expect(where).toContain('"category"');
    expect(where).toContain('"shortDescription"');
    expect(where).toContain('"content"');
  });

  it("returns an english voice product that passes the content quality gate", async () => {
    prismaMock.tool.findMany.mockResolvedValue([
      {
        id: "voice-tool",
        slug: "local-voice-generator",
        name: "本地语音生成器",
        englishName: "Local AI Voice Generator",
        shortDescription:
          "Create voiceovers, narration, and reusable audio assets in a local Windows workflow.",
        content:
          "This local AI voice generator supports text-to-speech, authorized voice cloning, voice design, multi-speaker dialogue, and organized audio asset management for practical production workflows.",
        type: "software",
        category: { name: "Voice Generation" },
      },
    ]);
    prismaMock.newsArticle.findMany.mockResolvedValue([]);

    const results = await searchPublicContent("voice", "en");

    expect(results).toEqual([
      expect.objectContaining({
        id: "tool-voice-tool",
        type: "tool",
        title: "Local AI Voice Generator",
        href: "/en/software/local-voice-generator",
      }),
    ]);
  });
});
