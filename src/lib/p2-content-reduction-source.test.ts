import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("P2 content reduction source contracts", () => {
  it("keeps the approved catalog compact while folding legacy listing guidance", () => {
    const software = read("src/app/software/page-shell.tsx");
    const softwareCatalog = read(
      "src/components/redesign/software/EnheRedesignSoftwareCatalog.tsx",
    );
    const accountServices = read("src/app/account-services/page-shell.tsx");
    const css = read("src/app/globals.css");

    expect(software).toContain("EnheRedesignSoftwareCatalog");
    expect(softwareCatalog).toContain("<EnheRedesignSoftwareCategorySelector");
    expect(softwareCatalog).toContain('data-section="all-products"');
    expect(softwareCatalog.indexOf("<EnheRedesignSoftwareCategorySelector")).toBeLessThan(
      softwareCatalog.indexOf('data-section="all-products"'),
    );
    expect(softwareCatalog).not.toContain("ListingGuidanceFold");
    expect(softwareCatalog).not.toContain("FilterBar");

    expect(accountServices).toContain("<ListingGuidanceFold forceLocale={forceLocale} />");
    expect(accountServices).toContain('className="content-fold listing-guidance-fold"');
    expect(accountServices).toContain("<ListingDecisionStrip forceLocale={forceLocale} />");
    expect(accountServices).toContain("<ListingTrustNote forceLocale={forceLocale} />");
    expect(accountServices).toContain("buildFaqSchema");
    expect(accountServices.indexOf("<ListingGuidanceFold")).toBeLessThan(
      accountServices.indexOf("<FilterBar"),
    );
    expect(accountServices.indexOf("<FilterBar")).toBeLessThan(
      accountServices.indexOf("<ToolCard key={tool.id}"),
    );

    expect(css).toContain(".listing-guidance-fold");
  });

  it("folds pricing support notes while keeping offers and OfferCatalog visible", () => {
    const pricing = read("src/app/pricing/page-shell.tsx");
    const css = read("src/app/globals.css");

    expect(pricing).toContain(
      "<StructuredData data={[breadcrumbSchema, pricingOfferCatalogSchema]} />",
    );
    expect(pricing).toContain("getPricingOfferItems");
    expect(pricing).toContain('className="content-fold pricing-guidance-fold"');
    expect(pricing.indexOf("pricingOfferItemsForLocale.map((item) => (")).toBeLessThan(
      pricing.indexOf('className="content-fold pricing-guidance-fold"'),
    );
    expect(css).toContain(".pricing-guidance-fold");
  });
});
