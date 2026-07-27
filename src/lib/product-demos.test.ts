import { describe, expect, it } from "vitest";
import {
  buildProductDemoMetadataTitle,
  buildProductDemoVideoObjectSchema,
  getLocalizedProductDemoCoverAlt,
  getLocalizedProductDemoDescription,
  getLocalizedProductDemoProductType,
  getLocalizedProductDemoTags,
  getLocalizedProductDemoTitle,
  getProductDemoSchemaUploadDate,
  getProductDemoVideoUrl,
  type PublicProductDemo,
} from "@/lib/product-demos";
import { enheOrganizationReference } from "@/lib/brand-entity";

function makeDemo(overrides: Partial<PublicProductDemo> = {}) {
  return {
    id: "demo-1",
    title: "人像面部更换AI工具 | AI智能体",
    slug: "faceswap-studio-ai-demo",
    description:
      "软件支持图片与视频素材导入，可用于授权素材的人像面部合成工具、素材融合处理、画面增强、高清修复和导出。",
    category: "software",
    tags: ["图片换脸", "AI Face Swap"],
    coverImage: "/uploads/product-demos/faceswap-cover.png",
    coverAlt: "FaceSwap Studio AI demo cover",
    videoUrl: "/uploads/product-demo-videos/faceswap-demo.mp4",
    videoDuration: "PT1M20S",
    uploadDate: null,
    publishedAt: "2026-06-01T10:20:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-06-01T10:20:00.000Z",
    productType: "AI生成视频 | AI生成图片 | 智能体",
    relatedProductUrl: null,
    relatedProductSlug: "faceswap-studio-ai",
    demoUrl: null,
    tutorialUrl: null,
    isFeaturedOnHome: true,
    sortOrder: 0,
    status: "published",
    transcript: null,
    faq: [],
    seoTitle: null,
    seoDescription: null,
    canonicalUrl: null,
    relatedProductId: "tool-1",
    relatedProduct: {
      id: "tool-1",
      name: "人像面部更换AI工具",
      englishName: "FaceSwap Studio AI",
      slug: "faceswap-studio-ai",
      type: "software",
      shortDescription: "FaceSwap Studio AI helps review face-swap workflows before purchase.",
      content: "",
      coverImage: "/uploads/product-demos/faceswap-cover.png",
      downloadPrice: 0,
      category: { id: "cat-1", name: "AI软件应用", slug: "ai-software", sortOrder: 0 },
      priceSpecs: [],
      tutorials: [],
    },
    ...overrides,
  } as unknown as PublicProductDemo;
}

describe("product demo localization and schema helpers", () => {
  it("serializes cached string dates for VideoObject uploadDate", () => {
    const demo = makeDemo();

    expect(getProductDemoSchemaUploadDate(demo)).toBe("2026-06-01T10:20:00.000Z");
    expect(() => buildProductDemoVideoObjectSchema(demo, "en")).not.toThrow();
    expect(buildProductDemoVideoObjectSchema(demo, "en")).toMatchObject({
      "@type": "VideoObject",
      uploadDate: "2026-06-01T10:20:00.000Z",
      inLanguage: "en-US",
      publisher: enheOrganizationReference,
    });
  });

  it("routes private COS demo videos through the playable site proxy", () => {
    const demo = makeDemo({
      videoUrl: "cos://enhe-ai-tools-1303691623/tool-videos/product-demo-videos/ai-video/demo.mp4",
    });

    expect(getProductDemoVideoUrl(demo)).toBe(
      "/api/tool-videos?src=cos%3A%2F%2Fenhe-ai-tools-1303691623%2Ftool-videos%2Fproduct-demo-videos%2Fai-video%2Fdemo.mp4",
    );
  });

  it("uses explicit localized blocks before generated English fallbacks", () => {
    const demo = makeDemo({
      title: "[[zh]]中文演示标题[[/zh]]\n[[en]]English demo title[[/en]]",
      description: "[[zh]]中文演示简介[[/zh]]\n[[en]]English demo description for cards.[[/en]]",
      productType: "[[zh]]AI生成视频[[/zh]][[en]]AI Video Generation[[/en]]",
      tags: ["[[zh]]图片换脸[[/zh]][[en]]Image Face Swap[[/en]]"],
    });

    expect(getLocalizedProductDemoTitle(demo, "zh")).toBe("中文演示标题");
    expect(getLocalizedProductDemoTitle(demo, "en")).toBe("English demo title");
    expect(getLocalizedProductDemoDescription(demo, "en")).toBe("English demo description for cards.");
    expect(getLocalizedProductDemoProductType(demo, "en")).toBe("AI Video Generation");
    expect(getLocalizedProductDemoTags(demo, "en")).toEqual(["Image Face Swap"]);
  });

  it("uses explicit localized cover alt blocks", () => {
    const demo = makeDemo({
      coverAlt: "[[zh]]\u4e2d\u6587\u5c01\u9762\u56fe[[/zh]][[en]]English demo cover image[[/en]]",
    });

    expect(getLocalizedProductDemoCoverAlt(demo, "en")).toBe("English demo cover image");
  });

  it("generates readable English card copy when demo fields are Chinese-only", () => {
    const demo = makeDemo({ coverAlt: "\u4eba\u50cf\u9762\u90e8\u66f4\u6362AI\u5de5\u5177" });

    expect(getLocalizedProductDemoTitle(demo, "en")).toBe("FaceSwap Studio AI Demo");
    expect(getLocalizedProductDemoDescription(demo, "en")).toContain("FaceSwap Studio AI");
    expect(getLocalizedProductDemoProductType(demo, "en")).toBe("AI Video Generation / AI Image Generation / AI Agent");
    expect(getLocalizedProductDemoTags(demo, "en")).toEqual(["Image Face Swap", "AI Face Swap"]);
    expect(getLocalizedProductDemoCoverAlt(demo, "en")).toBe("FaceSwap Studio AI Demo cover image");
  });

  it("does not reuse a Chinese SEO title on English product demo pages", () => {
    const title = buildProductDemoMetadataTitle(
      makeDemo({ seoTitle: "AI视频生成工具功能演示" }),
      "en",
    );

    expect(title).toContain("FaceSwap Studio AI");
    expect(title).not.toMatch(/[\u3400-\u9fff]/);
  });
});
