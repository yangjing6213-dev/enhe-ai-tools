import { describe, expect, it } from "vitest";
import {
  applyKeywordInterventions,
  buildAiNewsKeywordCloud,
  buildAiNewsTopicCollections,
  defaultAiNewsExternalSeoProvider,
  normalizeAiNewsKeyword,
  passesAiNewsKeywordSeoRules
} from "@/lib/ai-news-discovery";

describe("AI news discovery helpers", () => {
  it("normalizes keywords and removes noisy fragments", () => {
    expect(normalizeAiNewsKeyword("  AIVideo  ")).toBe("AIVideo");
    expect(normalizeAiNewsKeyword("AI")).toBeNull();
    expect(normalizeAiNewsKeyword("2026")).toBeNull();
    expect(normalizeAiNewsKeyword("***")).toBeNull();
  });

  it("checks SEO admission rules against article coverage and signal strength", () => {
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "AIVideo",
        articleCount: 3,
        searchCount30d: 0,
        totalHeat: 0
      })
    ).toBe(true);
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "tool",
        articleCount: 10,
        searchCount30d: 12,
        totalHeat: 100
      })
    ).toBe(false);
    expect(
      passesAiNewsKeywordSeoRules({
        keyword: "AIVideo",
        articleCount: 1,
        searchCount30d: 1,
        totalHeat: 1
      })
    ).toBe(false);
  });

  it("applies pin, hide, rename, and weight boost intervention rules", () => {
    const items = applyKeywordInterventions(
      [
        { keyword: "AIVideo", score: 10, displayName: "AIVideo", articleCount: 4, searchCount30d: 7, totalHeat: 22 },
        { keyword: "OpenAI", score: 8, displayName: "OpenAI", articleCount: 3, searchCount30d: 3, totalHeat: 14 }
      ],
      [
        { keyword: "OpenAI", locale: "zh", isPinned: true, isHidden: false, displayName: "OpenAI News", weightBoost: 6 },
        { keyword: "AIVideo", locale: "zh", isPinned: false, isHidden: true, displayName: null, weightBoost: 0 }
      ]
    );

    expect(items).toEqual([expect.objectContaining({ keyword: "OpenAI", displayName: "OpenAI News", isPinned: true })]);
  });

  it("builds a ranked keyword cloud capped to 12 items", async () => {
    const items = await buildAiNewsKeywordCloud({
      locale: "zh",
      candidates: Array.from({ length: 14 }).map((_, index) => ({
        keyword: `AIKeyword${index + 1}`,
        articleCount: 3,
        searchCount30d: index + 1,
        totalHeat: 20 - index,
        freshnessDays: 2,
        tagHits: 1,
        keywordFieldHits: 1
      })),
      interventions: [],
      externalProvider: defaultAiNewsExternalSeoProvider
    });

    expect(items).toHaveLength(12);
    expect(items[0]?.keyword).toBe("AIKeyword14");
  });

  it("builds exactly five topic collections with keyword fallback", () => {
    const topics = buildAiNewsTopicCollections({
      locale: "zh",
      keywordItems: [
        { keyword: "AIVideo", displayName: "AIVideo", score: 12, articleCount: 4, searchCount30d: 9, totalHeat: 24, isPinned: false },
        { keyword: "ComfyUI", displayName: "ComfyUI", score: 11, articleCount: 4, searchCount30d: 8, totalHeat: 18, isPinned: false }
      ],
      fallbackTags: [
        { keyword: "LocalAI", displayName: "LocalAI", score: 10, articleCount: 4, searchCount30d: 0, totalHeat: 12, isPinned: false },
        { keyword: "AIOffice", displayName: "AIOffice", score: 9, articleCount: 4, searchCount30d: 0, totalHeat: 10, isPinned: false },
        { keyword: "AIAgent", displayName: "AIAgent", score: 8, articleCount: 4, searchCount30d: 0, totalHeat: 8, isPinned: false }
      ]
    });

    expect(topics).toHaveLength(5);
    expect(topics.map((item) => item.query)).toEqual(["AIVideo", "ComfyUI", "LocalAI", "AIOffice", "AIAgent"]);
  });

  it("pads topic collections to five items when live signals are insufficient", () => {
    const topics = buildAiNewsTopicCollections({
      locale: "zh",
      keywordItems: [{ keyword: "AIInfo", displayName: "AIInfo", score: 12, articleCount: 4, searchCount30d: 9, totalHeat: 24, isPinned: false }],
      fallbackTags: [
        { keyword: "ENHEAI", displayName: "ENHEAI", score: 11, articleCount: 4, searchCount30d: 6, totalHeat: 18, isPinned: false },
        { keyword: "TrendInsight", displayName: "TrendInsight", score: 10, articleCount: 4, searchCount30d: 0, totalHeat: 12, isPinned: false },
        { keyword: "ToolWorkflow", displayName: "ToolWorkflow", score: 9, articleCount: 4, searchCount30d: 0, totalHeat: 10, isPinned: false }
      ]
    });

    expect(topics).toHaveLength(5);
    expect(new Set(topics.map((item) => item.key)).size).toBe(5);
  });
});
