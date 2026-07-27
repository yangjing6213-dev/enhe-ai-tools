import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPricingOfferItems } from "@/lib/pricing-offers";
import { buildPricingOfferCatalogSchema } from "@/app/pricing/page-shell";

describe("pricing offers", () => {
  it("uses product-level public pricing entries instead of category-only offers", () => {
    const zhOffers = getPricingOfferItems("zh");

    expect(zhOffers.length).toBeGreaterThanOrEqual(7);
    expect(zhOffers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "windows-ai",
          path: "/software/windows-ai",
          price: 50,
        }),
        expect.objectContaining({
          slug: "local-ai-voice-generator-for-voiceover-materials",
          path: "/software/local-ai-voice-generator-for-voiceover-materials",
          price: 30,
        }),
        expect.objectContaining({
          slug: "gmail-google",
          path: "/account-services/gmail-google",
          price: 30.8,
        }),
        expect.objectContaining({
          slug: "ai-monetization-side-hustle-course",
          path: "/skill-learning/ai-monetization-side-hustle-course",
          price: 0,
        }),
      ]),
    );
  });

  it("keeps English offer paths under the English route prefix", () => {
    expect(getPricingOfferItems("en").map((item) => item.path)).toContain(
      "/en/software/windows-ai",
    );
  });

  it("excludes retired offers and keeps free courses at zero price", () => {
    const offers = getPricingOfferItems("zh");
    const courseOffers = offers.filter((item) => item.type === "course");

    expect(offers.some((item) => item.slug === "gemini-pro")).toBe(false);
    expect(courseOffers).toHaveLength(2);
    expect(courseOffers.every((item) => item.price === 0)).toBe(true);
  });

  it("emits free course prices consistently in OfferCatalog schema", () => {
    const schema = buildPricingOfferCatalogSchema("en");
    const courseOffers = schema.itemListElement.filter(
      (item) => item.itemOffered["@type"] === "Course",
    );

    expect(courseOffers).toHaveLength(2);
    expect(courseOffers.every((item) => item.price === "0.00")).toBe(true);
    expect(
      schema.itemListElement.some((item) => item.url.endsWith("/gemini-pro")),
    ).toBe(false);
  });

  it("keeps the machine-readable pricing file aligned with public offers", () => {
    const pricingMarkdown = readFileSync(
      join(process.cwd(), "public/pricing.md"),
      "utf8",
    );

    expect(pricingMarkdown).not.toContain("### Gemini Pro guidance");
    expect(pricingMarkdown).toContain("### Practical AI side project course");
    expect(pricingMarkdown).toContain("### High-frequency AI prompts");
    expect(pricingMarkdown.match(/- Price: CNY 0\.00/g)).toHaveLength(2);
  });
});
