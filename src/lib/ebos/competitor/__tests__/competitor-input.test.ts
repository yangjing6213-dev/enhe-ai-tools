import { describe, expect, test } from "vitest";
import {
  getDefaultCompetitorSeeds,
  loadCompetitorManualInput,
  normalizeCompetitorSeeds
} from "../competitor-input";

describe("competitor input", () => {
  test("default seeds include the three required competitor categories", () => {
    const seeds = getDefaultCompetitorSeeds();

    expect(seeds.map((seed) => seed.name)).toEqual(expect.arrayContaining([
      "Futurepedia",
      "There's An AI For That",
      "Toolify",
      "FutureTools",
      "Gumroad Discover",
      "Whop Discover",
      "Product Hunt",
      "GitHub Trending",
      "Hugging Face Spaces"
    ]));
    expect(new Set(seeds.map((seed) => seed.category))).toEqual(new Set([
      "ai_tool_directory",
      "digital_product_marketplace",
      "technical_workflow_reference"
    ]));
    expect(seeds.every((seed) => (seed.recommendedAuditPaths?.length ?? 0) <= 3)).toBe(true);
    expect(seeds.find((seed) => seed.id === "futurepedia")?.recommendedAuditPaths).toEqual(expect.arrayContaining([
      "/",
      "/ai-tools"
    ]));
  });

  test("manual input returns a warning that seeds are observation targets", async () => {
    const result = await loadCompetitorManualInput({
      input: {
        seeds: [{
          id: "manual-ai-agent",
          name: "Manual AI Agent Directory",
          url: "https://example.com/ai-agents",
          category: "ai_tool_directory",
          priority: "high",
          source: "manual"
        }]
      }
    });

    expect(result.seeds).toHaveLength(1);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "manual_competitor_seed",
      source: "manual_input",
      message: expect.stringContaining("observation")
    }));
  });

  test("normalizes and deduplicates seeds by URL", () => {
    const result = normalizeCompetitorSeeds([
      {
        id: "futurepedia-1",
        name: "Futurepedia",
        url: "https://www.futurepedia.io/",
        category: "ai_tool_directory",
        priority: "medium",
        source: "manual"
      },
      {
        id: "futurepedia-duplicate",
        name: "Futurepedia Duplicate",
        url: "https://www.futurepedia.io",
        category: "ai_tool_directory",
        priority: "high",
        source: "user_input"
      }
    ]);

    expect(result.seeds).toHaveLength(1);
    expect(result.seeds[0]).toMatchObject({
      id: "futurepedia-duplicate",
      priority: "high",
      source: "user_input"
    });
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "duplicate_competitor_seed"
    }));
  });

  test("invalid seed URLs produce warnings without crashing", () => {
    const result = normalizeCompetitorSeeds([
      {
        id: "bad-url",
        name: "Bad URL",
        url: "not a url",
        category: "other",
        priority: "low",
        source: "manual",
        recommendedAuditPaths: ["/", "/pricing", "/tools", "/extra"]
      }
    ]);

    expect(result.seeds).toHaveLength(0);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "invalid_competitor_seed_url"
    }));
  });
});
