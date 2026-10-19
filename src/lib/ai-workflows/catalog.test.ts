import { describe, expect, it } from "vitest";
import { buildAiWorkflowCatalogWhere, parseAiWorkflowCatalogFilters } from "@/lib/ai-workflows/catalog";

describe("AI Workflow catalog filters", () => {
  it("normalizes URL filters and keeps valid pagination", () => {
    expect(parseAiWorkflowCatalogFilters({ q: "  meeting  ", topic: "work-efficiency", paid: "paid", environment: "windows", type: "agent", sort: "rating", page: "3" })).toEqual({
      q: "meeting",
      topic: "work-efficiency",
      paid: "paid",
      environment: "windows",
      type: "agent",
      sort: "rating",
      page: 3,
      pageSize: 12,
    });
  });

  it("falls back safely for unsupported values", () => {
    expect(parseAiWorkflowCatalogFilters({ paid: "all-time", environment: "other", type: "unknown", sort: "stars", page: "-5" })).toEqual({
      q: "",
      topic: "",
      paid: "all",
      environment: "all",
      type: "all",
      sort: "recommended",
      page: 1,
      pageSize: 12,
    });
  });

  it("searches the English collection topic name as well as the Chinese name", () => {
    const where = buildAiWorkflowCatalogWhere(parseAiWorkflowCatalogFilters({ q: "research" }));
    expect(JSON.stringify(where)).toContain('"englishName":{"contains":"research","mode":"insensitive"}');
  });
});
