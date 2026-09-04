import { describe, expect, test } from "vitest";
import { calculateConfidence } from "../confidence";
import { createDataSourceState } from "../data-source";

describe("EBOS confidence", () => {
  test("returns unknown when no usable data source is configured", () => {
    expect(calculateConfidence([])).toBe("unknown");
    expect(calculateConfidence([createDataSourceState("google_search_console")])).toBe("unknown");
  });

  test("returns unavailable when configured sources are unavailable", () => {
    expect(calculateConfidence([createDataSourceState("google_analytics", "unavailable")])).toBe("unavailable");
  });

  test("returns partial for mixed or incomplete data sources", () => {
    expect(
      calculateConfidence([
        createDataSourceState("internal_database", "available"),
        createDataSourceState("google_search_console", "partial")
      ])
    ).toBe("partial");
  });

  test("returns complete only when configured sources are available", () => {
    expect(
      calculateConfidence([
        createDataSourceState("internal_database", "available"),
        createDataSourceState("manual_input", "available")
      ])
    ).toBe("complete");
  });
});

