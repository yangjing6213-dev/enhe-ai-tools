import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAiNewsSerpTitle } from "@/lib/ai-news";
import {
  buildPricingOfferItems,
  renderPricingMarkdown,
  type PricingCatalogTool,
} from "@/lib/pricing-offers";
import { getLocalizedProductDemoFaq } from "@/lib/product-demos";
import {
  absoluteUrl,
  buildOrganizationSchema,
  buildProductStructuredData,
} from "@/lib/seo";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("SEO and GEO closure regressions", () => {
  it("keeps audited news titles semantically complete", () => {
    expect(
      buildAiNewsSerpTitle({
        title: "Kimi K3与下一代AI创作工作流升级",
        categoryName: "AI资讯",
        locale: "zh",
        maxLength: 8,
      }),
    ).toBe("Kimi K3");
    expect(
      buildAiNewsSerpTitle({
        title: "OpenAI releases GPT-5.6: creators get faster multimodal workflows",
        categoryName: "AI News",
        locale: "en",
        maxLength: 40,
      }),
    ).toBe("OpenAI releases GPT-5.6");
  });

  it("keeps paid product copy and machine-readable pricing on one live catalog", () => {
    const promptProduct: PricingCatalogTool = {
      slug: "ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
      name: "AI提示词管理系统",
      englishName: "AI Prompt Management System",
      type: "software",
      status: "published",
      shortDescription: "A free prompt workspace for writing and SEO.",
      content: "",
      category: { name: "AI software" },
      isDownloadPaid: true,
      downloadPrice: 0,
      tutorials: [],
      priceSpecs: [
        {
          id: "prompt-price",
          name: "Default access",
          price: 1,
          sortOrder: 0,
          status: "active",
        },
      ],
    };
    const items = buildPricingOfferItems([promptProduct], "en");
    const markdown = renderPricingMarkdown(items);

    expect(items[0].localized.description).not.toMatch(/\bfree\b/i);
    expect(markdown).toContain("- Price: CNY 1.00");
    expect(existsSync(join(root, "src/app/pricing.md/route.ts"))).toBe(true);
    expect(existsSync(join(root, "public/pricing.md"))).toBe(false);
  });

  it("keeps visible content, localization, and structured data aligned", () => {
    const home = read("src/app/page-shell.tsx");
    const englishFaq = getLocalizedProductDemoFaq(
      {
        slug: "windows-ai-video-studio",
        faq: [
          {
            question: "这个 AI 视频生成应用需要联网吗？",
            answer: "模型安装完成后可在本地生成视频。",
          },
        ],
      },
      "en",
    );
    const organization = buildOrganizationSchema({ name: "ENHE AI" });
    const product = buildProductStructuredData({
      name: "ENHE AI Product",
      url: "/software/enhe-ai-product",
      price: 35,
    });

    expect(home).not.toContain("buildFaqSchema");
    expect(JSON.stringify(englishFaq)).not.toMatch(/[\u3400-\u9fff]/);
    expect(organization.hasMerchantReturnPolicy).toMatchObject({
      merchantReturnLink: absoluteUrl("/legal/membership-refund"),
    });
    expect(product.offers).toMatchObject({
      hasMerchantReturnPolicy: {
        merchantReturnLink: absoluteUrl("/legal/membership-refund"),
      },
    });
  });

  it("keeps the confirmed product LCP fixes without changing homepage motion", () => {
    const toolDetail = read("src/app/tools/[slug]/page-shell.tsx");
    const rootLayout = read("src/app/root-layout-shared.tsx");
    const home = read("src/app/page-shell.tsx");

    expect(toolDetail).toContain("priority");
    expect(toolDetail).toContain('fetchPriority="high"');
    expect(rootLayout).not.toContain("montserrat-latin-800-normal.woff2");
    expect(rootLayout).not.toContain("montserrat-latin-900-normal.woff2");
    expect(home).toContain("home-hero-liquid-layer");
    expect(home).toContain("HomeParticlesBackground");
  });

  it("keeps primary product listings on a valid heading hierarchy", () => {
    const card = read("src/components/tool-card.tsx");
    const listingPages = [
      read("src/app/software/page-shell.tsx"),
      read("src/app/account-services/page-shell.tsx"),
      read("src/app/skill-learning/page-shell.tsx"),
      read("src/app/online-tools/page-shell.tsx"),
    ];

    expect(card).toContain("headingLevel?: 2 | 3");
    expect(card).toContain('const Heading = headingLevel === 2 ? "h2" : "h3"');
    for (const page of listingPages) {
      expect(page).toContain("headingLevel={2}");
    }
  });
});
