import { describe, expect, test } from "vitest";
import {
  EBOS_DATA_SOURCE_KEYS,
  EBOS_DATA_SOURCE_STATUSES,
  createDataSourceState,
  getDataSourceCompletenessScore,
  isConfiguredDataSource,
  isUsableDataSource
} from "../data-source";

describe("EBOS data sources", () => {
  test("defines the v1.0 source keys and statuses", () => {
    expect(EBOS_DATA_SOURCE_KEYS).toEqual([
      "google_search_console",
      "google_analytics",
      "bing_webmaster",
      "cloudflare",
      "internal_database",
      "whop",
      "manual_input",
      "market_research",
      "ai_search_probe"
    ]);
    expect(EBOS_DATA_SOURCE_STATUSES).toEqual(["not_configured", "unavailable", "partial", "available"]);
  });

  test("creates typed source state with safe defaults", () => {
    expect(createDataSourceState("internal_database")).toMatchObject({
      key: "internal_database",
      status: "not_configured",
      warnings: []
    });
  });

  test("classifies configured and usable sources", () => {
    expect(isConfiguredDataSource(createDataSourceState("cloudflare"))).toBe(false);
    expect(isConfiguredDataSource(createDataSourceState("cloudflare", "unavailable"))).toBe(true);
    expect(isUsableDataSource(createDataSourceState("cloudflare", "partial"))).toBe(true);
    expect(isUsableDataSource(createDataSourceState("cloudflare", "unavailable"))).toBe(false);
  });

  test("maps status to completeness scores", () => {
    expect(getDataSourceCompletenessScore("not_configured")).toBe(0);
    expect(getDataSourceCompletenessScore("unavailable")).toBe(0);
    expect(getDataSourceCompletenessScore("partial")).toBe(0.5);
    expect(getDataSourceCompletenessScore("available")).toBe(1);
  });
});

