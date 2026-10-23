import { describe, expect, it } from "vitest";
import { buildAiWorkflowCatalogWhere, normalizeAiWorkflowCatalogSearchParams, parseAiWorkflowCatalogFilters } from "@/lib/ai-workflows/catalog";

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

  it("uses the first repeated query value consistently and trims display inputs", () => {
    const normalized = normalizeAiWorkflowCatalogSearchParams({ q: ["  first  ", "second"], sort: ["invalid", "latest"], page: ["2", "3"] });
    expect(normalized).toEqual({ q: "  first  ", sort: "invalid", page: "2" });
    expect(parseAiWorkflowCatalogFilters(normalized)).toMatchObject({ q: "first", sort: "recommended", page: 2 });
  });

  it.each(["-4", "NaN", "", "0"])("normalizes invalid page value %s to the first page", (page) => {
    expect(parseAiWorkflowCatalogFilters({ page }).page).toBe(1);
  });

  it("searches the English collection topic name as well as the Chinese name", () => {
    const where = buildAiWorkflowCatalogWhere(parseAiWorkflowCatalogFilters({ q: "research" }));
    expect(JSON.stringify(where)).toContain('"englishName":{"contains":"research","mode":"insensitive"}');
  });

  it("requires the explicit free flag instead of treating an unconfirmed paid price as free", () => {
    expect(buildAiWorkflowCatalogWhere(parseAiWorkflowCatalogFilters({ paid: "free" }))).toEqual({
      type: "ai_workflow",
      status: "published",
      AND: [{ isDownloadPaid: false }],
    });
  });

  it("continues requiring a positive price for paid-only results", () => {
    expect(buildAiWorkflowCatalogWhere(parseAiWorkflowCatalogFilters({ paid: "paid" }))).toMatchObject({
      AND: [{ isDownloadPaid: true, downloadPrice: { gt: 0 } }],
    });
  });
});
