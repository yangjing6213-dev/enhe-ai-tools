import { describe, expect, test } from "vitest";
import {
  calculateSignalRelevance,
  detectMarketTopics,
  detectProductTypes,
  detectUserProblems,
  normalizeMarketSignal
} from "../market-signal-normalizer";

describe("market signal normalizer", () => {
  test("detects AI Agent, video, voice, local AI, SEO/GEO and related topics", () => {
    const topics = detectMarketTopics("AI Agent video voice local AI SEO GEO browser agent MCP ComfyUI prompt kit workflow automation");

    expect(topics).toEqual(expect.arrayContaining([
      "ai_agent",
      "ai_video",
      "ai_voice",
      "local_ai",
      "seo_geo",
      "browser_agent",
      "mcp",
      "comfyui",
      "prompt_kit",
      "workflow",
      "automation"
    ]));
  });

  test("detects product types and user problems", () => {
    const text = "需要本地离线批量处理，缺少模板，不会写提示词，需要内容增长和商业化。";

    expect(detectProductTypes(text)).toEqual(expect.arrayContaining([
      "template_pack",
      "prompt_kit",
      "local_ai_bundle"
    ]));
    expect(detectUserProblems(text)).toEqual(expect.arrayContaining([
      "template_gap",
      "prompt_gap",
      "local_offline_need",
      "batch_processing",
      "content_growth",
      "monetization_need"
    ]));
  });

  test("calculates higher relevance for ENHE-aligned signals", () => {
    const strong = normalizeMarketSignal({
      source: "manual",
      sourceType: "manual",
      title: "AI Agent workflow pack for SEO/GEO automation",
      description: "Prompt kit and workflow templates help teams save time and commercialize AI content growth."
    });
    const weak = normalizeMarketSignal({
      source: "manual",
      sourceType: "manual",
      title: "Generic design inspiration",
      description: "Brand moodboard collection."
    });

    expect(calculateSignalRelevance(strong)).toBeGreaterThan(calculateSignalRelevance(weak));
    expect(strong.relevanceScore).toBeGreaterThanOrEqual(70);
  });
});
