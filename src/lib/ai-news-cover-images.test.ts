import { describe, expect, it } from "vitest";
import {
  buildAiNewsCoverImageDuplicateWhere,
  buildReplacementAiNewsCoverImage,
  findDuplicateAiNewsCoverGroups,
  getAiNewsCoverImageFingerprint
} from "@/lib/ai-news-cover-images";

describe("AI news cover image helpers", () => {
  it("fingerprints Unsplash image URLs without volatile query parameters", () => {
    expect(getAiNewsCoverImageFingerprint("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&w=1200")).toBe(
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72"
    );
    expect(getAiNewsCoverImageFingerprint(" https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80 ")).toBe(
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72"
    );
  });

  it("builds duplicate lookup rules that catch the same Unsplash image with different crops", () => {
    expect(buildAiNewsCoverImageDuplicateWhere("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&w=1200")).toEqual({
      coverImage: {
        startsWith: "https://images.unsplash.com/photo-1497366754035-f200968a6e72"
      }
    });
  });

  it("finds duplicate cover groups by fingerprint", () => {
    expect(
      findDuplicateAiNewsCoverGroups([
        { id: "a", coverImage: "https://images.unsplash.com/photo-a?auto=format" },
        { id: "b", coverImage: "https://images.unsplash.com/photo-a?w=1200" },
        { id: "c", coverImage: "https://images.unsplash.com/photo-c?w=1200" }
      ])
    ).toEqual([
      {
        fingerprint: "https://images.unsplash.com/photo-a",
        articles: [
          { id: "a", coverImage: "https://images.unsplash.com/photo-a?auto=format" },
          { id: "b", coverImage: "https://images.unsplash.com/photo-a?w=1200" }
        ]
      }
    ]);
  });

  it("chooses a distinct topic-relevant Unsplash replacement cover", () => {
    const replacement = buildReplacementAiNewsCoverImage({
      article: {
        id: "article-1",
        title: "AI agent workflow automation tools launch for enterprise teams",
        keywords: "AI agent workflow automation"
      },
      usedCoverImages: new Set(["https://images.unsplash.com/photo-1497366754035-f200968a6e72"])
    });

    expect(replacement).toContain("images.unsplash.com");
    expect(replacement).not.toContain("photo-1497366754035-f200968a6e72");
    expect(replacement).toContain("auto=format");
  });
});
