import { describe, expect, it } from "vitest";
import { enheOrganizationReference } from "@/lib/brand-entity";
import { buildPricingOfferCatalogSchema } from "@/app/pricing/page-shell";

describe("shared ENHE structured-data entity references", () => {
  it("uses the canonical organization reference for pricing offers", () => {
    const schema = buildPricingOfferCatalogSchema("zh");

    expect(schema.provider).toEqual(enheOrganizationReference);
    expect(schema.provider).not.toHaveProperty("@type");
  });
});
