import { describe, expect, it, vi } from "vitest";
import { getAiNewsCoverImageFingerprint } from "@/lib/ai-news-cover-images";
import { repairDuplicateAiNewsCoverImages } from "./repair-ai-news-cover-images";

describe("repair-ai-news-cover-images", () => {
  it("dry-runs duplicate cover replacements without updating articles", async () => {
    const update = vi.fn();
    const db = {
      newsArticle: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "article-old",
            title: "Older AI news",
            slug: "older-ai-news",
            keywords: "AI agents",
            description: null,
            summary: "Older summary",
            coverImage: "https://images.unsplash.com/photo-reused?auto=format&w=1200",
            createdAt: new Date("2026-06-01T00:00:00.000Z"),
            publishedAt: new Date("2026-06-01T00:00:00.000Z")
          },
          {
            id: "article-new",
            title: "New workflow automation story",
            slug: "new-workflow-automation-story",
            keywords: "AI workflow automation",
            description: null,
            summary: "New summary",
            coverImage: "https://images.unsplash.com/photo-reused?q=80",
            createdAt: new Date("2026-06-02T00:00:00.000Z"),
            publishedAt: new Date("2026-06-02T00:00:00.000Z")
          }
        ]),
        update
      }
    };

    const result = await repairDuplicateAiNewsCoverImages({ db, apply: false });

    expect(update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      inspectedCount: 2,
      duplicateGroupCount: 1,
      replacementCount: 1,
      applied: false
    });
    expect(result.replacements[0]).toMatchObject({
      id: "article-new",
      title: "New workflow automation story",
      oldCoverImage: "https://images.unsplash.com/photo-reused?q=80"
    });
    expect(getAiNewsCoverImageFingerprint(result.replacements[0].newCoverImage)).not.toBe("https://images.unsplash.com/photo-reused");
  });

  it("applies duplicate cover replacements when requested", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      newsArticle: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "article-1",
            title: "AI agent update",
            slug: "ai-agent-update",
            keywords: "AI agent",
            description: null,
            summary: "Summary",
            coverImage: "https://images.unsplash.com/photo-reused?auto=format&w=1200",
            createdAt: new Date("2026-06-01T00:00:00.000Z"),
            publishedAt: new Date("2026-06-01T00:00:00.000Z")
          },
          {
            id: "article-2",
            title: "AI local deployment update",
            slug: "ai-local-deployment-update",
            keywords: "local AI deployment",
            description: null,
            summary: "Summary",
            coverImage: "https://images.unsplash.com/photo-reused?w=800",
            createdAt: new Date("2026-06-02T00:00:00.000Z"),
            publishedAt: new Date("2026-06-02T00:00:00.000Z")
          }
        ]),
        update
      }
    };

    const result = await repairDuplicateAiNewsCoverImages({ db, apply: true });

    expect(result.applied).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "article-2" },
      data: { coverImage: result.replacements[0].newCoverImage }
    });
  });
});
