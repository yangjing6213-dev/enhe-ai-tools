import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  buildOrganizationSchema,
  buildProductStructuredData,
  buildToolStructuredData,
} from "@/lib/seo";

const expectedReturnPolicy = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "CN",
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
  merchantReturnLink: absoluteUrl("/legal/membership-refund"),
};

describe("merchant return policy structured data", () => {
  it("references the published refund rules from the Organization schema", () => {
    const schema = buildOrganizationSchema({ name: "ENHE AI" });

    expect(schema.hasMerchantReturnPolicy).toEqual(expectedReturnPolicy);
  });

  it("links the English Organization schema to the published English refund rules", () => {
    const schema = buildOrganizationSchema({
      name: "ENHE AI",
      returnPolicyPath: "/en/legal/membership-refund",
    });

    expect(schema.hasMerchantReturnPolicy).toEqual({
      ...expectedReturnPolicy,
      merchantReturnLink: absoluteUrl("/en/legal/membership-refund"),
    });
  });

  it("attaches the same factual policy to paid Product and SoftwareApplication offers", () => {
    const product = buildProductStructuredData({
      name: "ENHE AI Product",
      url: "/software/enhe-ai-product",
      price: 35,
    });
    const software = buildToolStructuredData({
      schemaType: "SoftwareApplication",
      name: "ENHE AI Software",
      url: "/software/enhe-ai-software",
      price: 35,
    });

    expect(product.offers).toMatchObject({
      "@type": "Offer",
      hasMerchantReturnPolicy: expectedReturnPolicy,
    });
    expect(software.offers).toMatchObject({
      "@type": "Offer",
      hasMerchantReturnPolicy: expectedReturnPolicy,
    });

    for (const schema of [product, software]) {
      expect(schema).not.toHaveProperty("aggregateRating");
      expect(schema).not.toHaveProperty("review");
      expect(schema).not.toHaveProperty("shippingDetails");
    }
  });

  it("links English offers to the published English refund rules", () => {
    const software = buildToolStructuredData({
      schemaType: "SoftwareApplication",
      name: "ENHE AI Software",
      url: "/en/software/enhe-ai-software",
      price: 35,
    });

    expect(software.offers).toMatchObject({
      hasMerchantReturnPolicy: {
        merchantReturnLink: absoluteUrl("/en/legal/membership-refund"),
      },
    });
  });

  it("keeps return-policy references on aggregate and catalog offers without inventing delivery data", () => {
    const service = buildToolStructuredData({
      schemaType: "Service",
      name: "ENHE AI Service",
      url: "/account-services/enhe-ai-service",
      priceSpecs: [
        { name: "Standard", price: 20 },
        { name: "Extended", price: 40 },
      ],
    });

    expect(service.offers).toMatchObject({
      "@type": "AggregateOffer",
      hasMerchantReturnPolicy: expectedReturnPolicy,
    });
    const catalog = (
      service as {
        hasOfferCatalog?: { itemListElement: unknown[] };
      }
    ).hasOfferCatalog;

    expect(catalog?.itemListElement).toEqual([
      expect.objectContaining({ hasMerchantReturnPolicy: expectedReturnPolicy }),
      expect.objectContaining({ hasMerchantReturnPolicy: expectedReturnPolicy }),
    ]);
    expect(service).not.toHaveProperty("shippingDetails");
  });
});
