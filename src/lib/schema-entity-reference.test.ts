import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enheOrganizationReference } from "@/lib/brand-entity";
import { buildPricingOfferCatalogSchema } from "@/app/pricing/page-shell";
import {
  buildFreeToolDetailOffer,
  resolveToolDetailSchemaPrice,
} from "@/app/tools/[slug]/page-shell";

describe("shared ENHE structured-data entity references", () => {
  it("uses the canonical organization reference for pricing offers", () => {
    const schema = buildPricingOfferCatalogSchema("zh", []);

    expect(schema.provider).toEqual(enheOrganizationReference);
    expect(schema.provider).not.toHaveProperty("@type");
  });

  it("uses the Organization reference for ENHE AI while preserving named people", async () => {
    const aiNews = (await import("@/lib/ai-news")) as Record<string, unknown>;
    const buildAuthor = aiNews.buildAiNewsAuthorSchema as
      | ((author: string | null, organization: { "@id": string }) => unknown)
      | undefined;

    expect(buildAuthor).toBeTypeOf("function");
    expect(buildAuthor?.("ENHE AI", enheOrganizationReference)).toEqual(
      enheOrganizationReference,
    );
    expect(buildAuthor?.("  enhe ai  ", enheOrganizationReference)).toEqual(
      enheOrganizationReference,
    );
    expect(buildAuthor?.("Li Ming", enheOrganizationReference)).toEqual({
      "@type": "Person",
      name: "Li Ming",
    });
  });

  it("wires the author helper and stable cover into NewsArticle schema", () => {
    const detail = readFileSync(
      join(process.cwd(), "src/app/ai-news/[slug]/page-shell.tsx"),
      "utf8",
    );

    expect(detail).toContain("buildAiNewsAuthorSchema");
    expect(detail).toContain("author: buildAiNewsAuthorSchema(");
    expect(detail).toContain("resolveAiNewsCoverImage(article.coverImage)");
  });

  it("identifies the canonical article URL as the NewsArticle main entity page", () => {
    const detail = readFileSync(
      join(process.cwd(), "src/app/ai-news/[slug]/page-shell.tsx"),
      "utf8",
    );

    expect(detail).toContain('mainEntityOfPage: {');
    expect(detail).toContain('"@type": "WebPage"');
    expect(detail).toContain('"@id": url');
  });

  it("emits zero-price offers only for confirmed free course and software details", () => {
    expect(resolveToolDetailSchemaPrice).toBeTypeOf("function");
    expect(buildFreeToolDetailOffer).toBeTypeOf("function");
    expect(
      resolveToolDetailSchemaPrice({
        toolType: "skill_learning",
        isDownloadPaid: false,
        servicePrice: 0,
      }),
    ).toBe(0);
    expect(
      resolveToolDetailSchemaPrice({
        toolType: "software",
        isDownloadPaid: false,
        servicePrice: 0,
      }),
    ).toBe(0);
    expect(
      resolveToolDetailSchemaPrice({
        toolType: "online",
        isDownloadPaid: false,
        servicePrice: 0,
      }),
    ).toBeNull();
    expect(
      resolveToolDetailSchemaPrice({
        toolType: "software",
        isDownloadPaid: true,
        servicePrice: 0,
      }),
    ).toBeNull();
    expect(
      buildFreeToolDetailOffer("https://www.enhe-tech.com.cn/software/codex-api"),
    ).toEqual({
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "CNY",
      availability: "https://schema.org/InStock",
      url: "https://www.enhe-tech.com.cn/software/codex-api",
    });
  });

  it("uses the resolved schema price in detail SoftwareApplication, Course, and Product data", () => {
    const detail = readFileSync(
      join(process.cwd(), "src/app/tools/[slug]/page-shell.tsx"),
      "utf8",
    );

    expect(detail).toContain("const schemaPrice = resolveToolDetailSchemaPrice({");
    expect(detail.match(/price: schemaPrice/g)).toHaveLength(2);
    expect(detail).toContain("offers: buildFreeToolDetailOffer(");
  });
});
