import { describe, expect, it } from "vitest";
import {
  createDefaultHomeProductShowcase,
  moveHomeShowcaseProduct,
  parseHomeProductShowcaseConfig,
  resolveHomeShowcaseMediaSrc,
} from "@/lib/redesign/home/home-product-showcase";

describe("editable homepage product showcase", () => {
  it("uses the existing homepage cards as the first managed configuration", () => {
    const products = createDefaultHomeProductShowcase();

    expect(products).toHaveLength(5);
    expect(products[0]).toMatchObject({
      id: "ultimate-edition",
      mediaType: "image",
      mediaSrc: "/redesign/home/ultimate-edition.png",
      detailHref: { zh: "https://www.enhe-tech.com.cn/software/ultimate-edition-ai-video-generation-suite" },
    });
  });

  it("accepts bilingual image and video cards with safe public links", () => {
    const products = createDefaultHomeProductShowcase();
    products[0] = { ...products[0], mediaType: "video", mediaSrc: "cos://bucket/tool-videos/home/demo.mp4" };

    expect(parseHomeProductShowcaseConfig(JSON.stringify({ version: 1, products }))).toEqual(products);
  });

  it.each([
    { version: 1, products: [] },
    { version: 2, products: createDefaultHomeProductShowcase() },
    { version: 1, products: [{ ...createDefaultHomeProductShowcase()[0], detailHref: { zh: "javascript:alert(1)", en: "https://example.com" } }] },
    { version: 1, products: [{ ...createDefaultHomeProductShowcase()[0], detailHref: { zh: "https://user:pass@example.com", en: "https://example.com" } }] },
    { version: 1, products: [{ ...createDefaultHomeProductShowcase()[0], mediaType: "video", mediaSrc: "javascript:alert(1)" }] },
    { version: 1, products: [{ ...createDefaultHomeProductShowcase()[0], mediaType: "video", mediaSrc: "cos://bucket/tool-videos/../private.mp4" }] },
    { version: 1, products: [createDefaultHomeProductShowcase()[0], createDefaultHomeProductShowcase()[0]] },
  ])("rejects an invalid homepage product configuration", (config) => {
    expect(parseHomeProductShowcaseConfig(JSON.stringify(config))).toBeNull();
  });

  it("moves a card by one position while preserving all product data", () => {
    const products = createDefaultHomeProductShowcase();

    expect(moveHomeShowcaseProduct(products, "ai-voice", -1).map(({ id }) => id)).toEqual([
      "ultimate-edition",
      "ai-voice",
      "infinitetalk",
      "lumi-os",
      "faceswap-studio",
    ]);
    expect(moveHomeShowcaseProduct(products, "ultimate-edition", -1)).toEqual(products);
  });

  it("routes private COS video locations through the existing video proxy", () => {
    const source = "cos://bucket/tool-videos/home/demo.mp4";

    expect(resolveHomeShowcaseMediaSrc(source)).toBe(`/api/tool-videos?src=${encodeURIComponent(source)}`);
    expect(resolveHomeShowcaseMediaSrc("/redesign/home/ultimate-edition.png")).toBe("/redesign/home/ultimate-edition.png");
  });
});
