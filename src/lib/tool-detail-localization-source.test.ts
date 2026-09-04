import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("tool detail localization source", () => {
  it("routes visible tool copy through shared localization helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/app/tools/[slug]/page-shell.tsx"), "utf8");

    expect(source).toContain('from "@/lib/tool-localization"');
    expect(source).toContain("buildLocalizedToolLongContent");
    expect(source).toContain("buildLocalizedToolSummary");
    expect(source).toContain("buildLocalizedToolFaqItems");
    expect(source).toContain("buildLocalizedToolOfferName");
    expect(source).toContain("buildLocalizedToolTagItems");
    expect(source).toContain("buildLocalizedToolTutorialItems");
    expect(source).toContain("resolveLocalizedToolCategoryName");
    expect(source).toContain("resolveLocalizedToolIdentity");
    expect(source).toContain("shouldIndexEnglishToolPage");
    expect(source).toContain("visibleTutorials");
    expect(source).toContain("visibleFaqs");
    expect(source).toContain("visibleChangelogs");
    expect(source).toContain("visibleComments");
    expect(source).toContain("localizedTool.primaryName");
    expect(source).toContain("localizedTagItems");
    expect(source).toContain("localizedPriceSpecs");
    expect(source).toContain("localizedSummary");
    expect(source).toContain("localizedLongContent");
  });
});
