import { describe, expect, it } from "vitest";
import {
  buildBrandSearchResult,
  buildPublicToolSearchWhere,
  mapPublicToolSearchType,
  normalizePublicSearchQuery,
} from "@/lib/public-search";

describe("public search", () => {
  it("normalizes whitespace and control characters without trusting raw query input", () => {
    expect(normalizePublicSearchQuery("  AI\u0000   tools\n guide  ")).toBe("AI tools guide");
    expect(normalizePublicSearchQuery("x".repeat(120))).toHaveLength(80);
    expect(normalizePublicSearchQuery(" \n\t ")).toBe("");
  });

  it("returns only the localized public brand page for matching brand queries", () => {
    expect(buildBrandSearchResult("恩禾", "zh")).toMatchObject({
      type: "brand",
      href: "/about",
    });
    expect(buildBrandSearchResult("ENHE", "en")).toMatchObject({
      type: "brand",
      href: "/en/about",
    });
    expect(buildBrandSearchResult("unrelated phrase", "zh")).toBeNull();
  });

  it("searches product names, categories, summaries, and body copy", () => {
    const where = JSON.stringify(buildPublicToolSearchWhere("voice"));

    expect(where).toContain('"name"');
    expect(where).toContain('"englishName"');
    expect(where).toContain('"category"');
    expect(where).toContain('"shortDescription"');
    expect(where).toContain('"content"');
  });

  it("labels search results using the published product type", () => {
    expect(mapPublicToolSearchType("software")).toBe("software");
    expect(mapPublicToolSearchType("ai_skill")).toBe("ai_skill");
    expect(mapPublicToolSearchType("ai_workflow")).toBe("ai_workflow");
    expect(mapPublicToolSearchType("online")).toBe("online");
  });
});
