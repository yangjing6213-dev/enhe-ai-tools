import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("thin content SEO source guards", () => {
  it("uses stable listing meta descriptions for account services, pricing, and tutorials", () => {
    const accountServices = read("src/app/account-services/page-shell.tsx");
    const pricing = read("src/app/pricing/page-shell.tsx");
    const tutorials = read("src/app/tutorials/page-shell.tsx");

    expect(accountServices).toContain('buildListingMetaDescription("account-services", forceLocale)');
    expect(pricing).toContain('buildListingMetaDescription("pricing", forceLocale)');
    expect(tutorials).toContain('buildListingMetaDescription("tutorials", forceLocale)');
  });

  it("supplements thin pricing and tutorials pages with crawlable guidance sections", () => {
    const pricing = read("src/app/pricing/page-shell.tsx");
    const tutorials = read("src/app/tutorials/page-shell.tsx");

    expect(pricing).toContain("purchaseGuidance");
    expect(pricing).toContain("paymentReview");
    expect(pricing).toContain("afterSalesBoundary");
    expect(tutorials).toContain("tutorialGuidance");
    expect(tutorials).toContain("workflowSteps");
    expect(tutorials).toContain("commonErrors");
  });
});
