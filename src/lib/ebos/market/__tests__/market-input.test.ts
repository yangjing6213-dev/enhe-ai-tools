import { describe, expect, test } from "vitest";
import {
  getDefaultMarketManualInput,
  normalizeManualMarketSignals,
  parseMarketRssSources
} from "../market-input";

describe("market input", () => {
  test("default manual input includes ENHE focus directions", () => {
    const input = getDefaultMarketManualInput();

    expect(input.observationTopics).toContain("AI Agent");
    expect(input.observationTopics).toContain("AI 视频生成");
    expect(input.observationTopics).toContain("ComfyUI 工作流");
    expect(input.observationTopics).toContain("MCP / Browser Agent");
  });

  test("manual input becomes market signals and emits an observation-seed warning", () => {
    const result = normalizeManualMarketSignals(getDefaultMarketManualInput());

    expect(result.signals.length).toBeGreaterThan(5);
    expect(result.signals.every((signal) => signal.sourceType === "manual")).toBe(true);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "manual_market_seed",
      message: expect.stringContaining("观察方向")
    }));
  });

  test("parses RSS source env without requiring network access", () => {
    const sources = parseMarketRssSources({
      EBOS_MARKET_RSS_URLS: "https://example.com/rss.xml|Example RSS, https://news.example.com/feed"
    });

    expect(sources).toEqual([
      { url: "https://example.com/rss.xml", label: "Example RSS" },
      { url: "https://news.example.com/feed", label: "https://news.example.com/feed" }
    ]);
  });
});
