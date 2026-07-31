import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPricingOfferItems,
  renderPricingMarkdown,
  type PricingCatalogTool,
} from "@/lib/pricing-offers";
import { buildPricingOfferCatalogSchema } from "@/app/pricing/page-shell";

function makeTool(
  overrides: Partial<PricingCatalogTool> & Pick<PricingCatalogTool, "slug">,
): PricingCatalogTool {
  return {
    name: overrides.slug,
    englishName: null,
    type: "software",
    status: "published",
    shortDescription: "A public AI tool for real workflows.",
    content: "",
    category: { name: "AI software" },
    isDownloadPaid: true,
    downloadPrice: 0,
    tutorials: [],
    priceSpecs: [
      {
        id: `${overrides.slug}-price`,
        name: "Default access",
        price: 9.9,
        sortOrder: 0,
        status: "active",
      },
    ],
    ...overrides,
  };
}

const currentPublicTools: PricingCatalogTool[] = [
  makeTool({
    slug: "ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
    name: "AI提示词管理系统｜中英文Prompt搜索、分类与一键复制",
    englishName: "AI Prompt Management System",
    shortDescription: "A free prompt workspace for writing and SEO.",
    priceSpecs: [
      {
        id: "prompt-price",
        name: "AI提示词管理系统",
        price: 1,
        sortOrder: 0,
        status: "active",
      },
    ],
  }),
  makeTool({
    slug: "infinitetalk-ai",
    name: "InfiniteTalk AI数字人口播视频",
    englishName: "InfiniteTalk AI talking video generator",
  }),
  makeTool({
    slug: "faceswap-studio-ai",
    name: "FaceSwap Studio｜本地人像合成研究工具",
    englishName: "FaceSwap Studio",
  }),
  makeTool({
    slug: "chatgpt-plus-100",
    name: "ChatGPT Plus 使用与订阅咨询",
    englishName: "ChatGPT Plus usage and subscription guidance",
    type: "online",
    category: { name: "AI账号服务" },
    isDownloadPaid: false,
    priceSpecs: [
      {
        id: "chatgpt-plus-monthly",
        name: "月度方案",
        price: 195,
        sortOrder: 0,
        status: "active",
      },
      {
        id: "chatgpt-plus-assisted",
        name: "协助方案",
        price: 200,
        sortOrder: 1,
        status: "active",
      },
      {
        id: "chatgpt-plus-retired",
        name: "停用方案",
        price: 180,
        sortOrder: 2,
        status: "disabled",
      },
    ],
  }),
  makeTool({
    slug: "ai-monetization-side-hustle-course",
    name: "AI副业实操课｜从工具到项目",
    englishName: "Practical AI side project course",
    type: "skill_learning",
    category: { name: "AI技能学习" },
    isDownloadPaid: false,
    tutorials: [{ status: "active" }],
    priceSpecs: [],
  }),
];

describe("pricing offers", () => {
  it("builds one public catalog for software, account services, and visible courses", () => {
    const offers = buildPricingOfferItems(
      [
        ...currentPublicTools,
        makeTool({ slug: "draft-tool", status: "draft" }),
        makeTool({
          slug: "course-without-lessons",
          type: "skill_learning",
          tutorials: [],
        }),
      ],
      "zh",
    );

    expect(offers.map((item) => item.slug)).toEqual(
      currentPublicTools.map((item) => item.slug),
    );
    expect(offers.find((item) => item.slug === "chatgpt-plus-100")?.path).toBe(
      "/account-services/chatgpt-plus-100",
    );
    expect(
      offers.find((item) => item.slug === "ai-monetization-side-hustle-course")
        ?.path,
    ).toBe("/skill-learning/ai-monetization-side-hustle-course");
  });

  it("keeps every active price specification and excludes disabled prices", () => {
    const chatgptPlus = buildPricingOfferItems(currentPublicTools, "en").find(
      (item) => item.slug === "chatgpt-plus-100",
    );

    expect(chatgptPlus?.offers.map((offer) => offer.price)).toEqual([195, 200]);
  });

  it("does not describe a paid CNY 1.00 product as free", () => {
    const promptProduct = buildPricingOfferItems(currentPublicTools, "en").find(
      (item) => item.slug.startsWith("ai-prompt-management-system"),
    );

    expect(promptProduct?.offers[0].price).toBe(1);
    expect(promptProduct?.localized.description).not.toMatch(/\bfree\b/i);
  });

  it("emits every active offer from the shared catalog in OfferCatalog schema", () => {
    const items = buildPricingOfferItems(currentPublicTools, "en");
    const schema = buildPricingOfferCatalogSchema("en", items);

    expect(schema.itemListElement).toHaveLength(6);
    expect(
      schema.itemListElement.filter((item) =>
        item.url.includes("/account-services/chatgpt-plus-100"),
      ).map((item) => item.price),
    ).toEqual(["195.00", "200.00"]);
    expect(
      schema.itemListElement.find((item) =>
        item.url.includes("/skill-learning/ai-monetization-side-hustle-course"),
      )?.price,
    ).toBe("0.00");
    expect(schema.itemListElement.every((item) => !("availability" in item))).toBe(
      true,
    );
  });

  it("renders pricing.md from the same catalog without a misleading paid-only claim", () => {
    const markdown = renderPricingMarkdown(
      buildPricingOfferItems(currentPublicTools, "en"),
    );

    expect(markdown).toContain("current public software, account service, and course offers");
    expect(markdown).not.toContain("current ENHE AI paid software");
    expect(markdown).toContain(
      "https://www.enhe-tech.com.cn/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
    );
    expect(markdown).toContain("- Price: CNY 1.00");
    expect(markdown).toContain("- Offer: Service option 1 | CNY 195.00");
    expect(markdown).toContain("- Offer: Service option 2 | CNY 200.00");
    expect(markdown).not.toMatch(/free prompt workspace/i);
  });

  it("serves pricing.md from the live shared catalog instead of a drifting build snapshot", () => {
    const routePath = join(process.cwd(), "src/app/pricing.md/route.ts");
    const pricingPage = readFileSync(
      join(process.cwd(), "src/app/pricing/page-shell.tsx"),
      "utf8",
    );

    expect(existsSync(routePath)).toBe(true);
    expect(existsSync(join(process.cwd(), "public/pricing.md"))).toBe(false);

    const route = readFileSync(routePath, "utf8");
    expect(route).toContain('getPricingOfferItems("en")');
    expect(route).toContain("renderPricingMarkdown");
    expect(route).toContain('content-type": "text/markdown; charset=utf-8"');
    expect(route).toContain("stale-while-revalidate=300");
    expect(pricingPage).toContain('import { connection } from "next/server"');
    expect(pricingPage).toContain("await connection()");
  });
});
