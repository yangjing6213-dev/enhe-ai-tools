import { describe, expect, it } from "vitest";
import {
  buildHomeMetaDescription,
  buildHomeMetadataTitle,
  buildListingMetadataTitle,
  buildListingMetaDescription,
  buildOrganizationSchema,
  getRevenuePageSeoTitle,
  buildMetaDescription,
  buildMetadataTitle,
  buildPageMetadata,
  buildTopicMetaDescription,
  buildToolMetaDescription,
  buildToolMetadataTitle
} from "@/lib/seo";

describe("seo helpers", () => {
  it("normalizes and truncates metadata descriptions", () => {
    expect(buildMetaDescription("  AI \n helper    for teams  ", "fallback", 17)).toBe("AI helper for");
    expect(buildMetaDescription("   ", "fallback")).toBe("fallback");
    expect(
      buildMetaDescription(
        "AI tools... help teams coordinate research, writing, and review workflows.",
        "fallback",
        48,
      ),
    ).not.toMatch(/\.{3}|…/);
  });

  it("keeps public page metadata descriptions concise", () => {
    const metadata = buildPageMetadata({
      title: "AI Software Apps",
      description:
        "Explore AI software apps for local deployment, productivity workflows, content creation, automation, audio, video, and daily work. Compare features, pricing, and access.",
      path: "/software",
      locale: "en_US",
      localeKey: "en"
    });

    expect(String(metadata.description).length).toBeLessThanOrEqual(150);
  });

  it("builds page titles without duplicating the brand", () => {
    expect(buildMetadataTitle({ pageTitle: "ENHE AI", brand: "ENHE AI" })).toBe("ENHE AI");
    expect(buildMetadataTitle({ pageTitle: "ENHE AI", brand: "Symbiosis ENHE AI" })).toBe("Symbiosis ENHE AI");
    expect(buildMetadataTitle({ pageTitle: "AI Software Apps", brand: "ENHE AI" })).toBe("AI Software Apps | ENHE AI");
    expect(buildMetadataTitle({ pageTitle: "AI Software Apps | ENHE AI", brand: "ENHE AI" })).toBe("AI Software Apps | ENHE AI");
  });

  it("builds useful listing metadata titles instead of short category labels", () => {
    const kinds = [
      "software",
      "account-services",
      "skill-learning",
      "pricing",
      "tutorials",
      "ai-news",
    ] as const;

    for (const kind of kinds) {
      const zhTitle = buildListingMetadataTitle(kind, "zh", "ENHE AI");
      const enTitle = buildListingMetadataTitle(kind, "en", "ENHE AI");

      expect(zhTitle.length).toBeGreaterThanOrEqual(24);
      expect(zhTitle.length).toBeLessThanOrEqual(68);
      expect(zhTitle).toContain("ENHE AI");
      expect(enTitle.length).toBeGreaterThanOrEqual(38);
      expect(enTitle.length).toBeLessThanOrEqual(68);
      expect(enTitle).toContain("ENHE AI");
    }

    expect(buildListingMetadataTitle("pricing", "en", "ENHE AI")).toContain("Pricing");
    expect(buildListingMetadataTitle("tutorials", "en", "ENHE AI")).toContain("Tutorials");
    expect(buildListingMetadataTitle("software", "zh", "ENHE AI")).toContain("最热门AI工具");
    expect(buildListingMetadataTitle("account-services", "zh", "ENHE AI")).toContain("AI账号服务");
    expect(buildListingMetadataTitle("account-services", "en", "ENHE AI")).toContain("AI Account Service");
    expect(buildListingMetadataTitle("skill-learning", "zh", "ENHE AI")).toContain("AI教程与实战指南");
    expect(buildListingMetadataTitle("skill-learning", "en", "ENHE AI")).toContain("Practical AI Tutorials");
    expect(buildListingMetaDescription("software", "zh")).toContain("最热门AI工具");
    expect(buildListingMetaDescription("account-services", "zh")).toContain("账号使用支持");
    expect(buildListingMetaDescription("account-services", "en")).toContain("AI account service guidance");
  });

  it("builds locale-aware tool titles without duplicate names", () => {
    expect(buildToolMetadataTitle({ name: "Symbiosis", englishName: "Symbiosis", brand: "ENHE AI" })).toBe(
      "Symbiosis | ENHE AI"
    );
    expect(buildToolMetadataTitle({ name: "即梦AI", englishName: "Dreamina", brand: "ENHE AI", locale: "zh" })).toBe(
      "即梦AI (Dreamina) | ENHE AI"
    );
    expect(buildToolMetadataTitle({ name: "Dreamina - AI Software App", englishName: null, brand: "ENHE AI", locale: "en" })).toBe(
      "Dreamina | AI Software App | ENHE AI"
    );

    const longTitle = buildToolMetadataTitle({
      name: "A very long product name for creators and operators",
      englishName: "Another descriptive English subtitle",
      brand: "ENHE AI",
      locale: "en",
      maxLength: 42
    });

    expect(longTitle.endsWith(" | ENHE AI")).toBe(true);
    expect(longTitle.length).toBeLessThanOrEqual(42);
    expect(longTitle).not.toContain("·");
    expect(longTitle).not.toContain("...");

    const longZhTitle = buildToolMetadataTitle({
      name: "A very long product name for creators and operators",
      englishName: "Another descriptive English subtitle",
      brand: "Symbiosis ENHE AI",
      locale: "zh",
      maxLength: 42
    });

    expect(longZhTitle.endsWith(" | Symbiosis ENHE AI")).toBe(true);
    expect(longZhTitle.length).toBeLessThanOrEqual(42);
    expect(longZhTitle).not.toContain("(");
  });

  it("builds locale-aware tool descriptions for detail pages", () => {
    const englishDescription = buildToolMetaDescription({
      name: "Dreamina",
      englishName: null,
      description: "Dreamina is an AI software app for image and video creation. Review pricing, tutorials, and access guidance on ENHE AI.",
      brand: "ENHE AI",
      locale: "en",
      type: "software"
    });

    expect(englishDescription).toBe(
      "Dreamina is an AI software app for image and video creation. Review pricing, tutorials, and access guidance on ENHE AI."
    );
    expect(englishDescription.length).toBeLessThanOrEqual(140);

    const chineseDescription = buildToolMetaDescription({
      name: "即梦AI",
      englishName: "Dreamina",
      description: "  一款用于生成图片和视频的 AI 创作工具。  ",
      brand: "ENHE AI",
      locale: "zh",
      type: "software"
    });

    expect(chineseDescription.startsWith("一款用于生成图片和视频的 AI 创作工具。")).toBe(true);
    expect(chineseDescription).toContain("ENHE AI");
    expect(chineseDescription.length).toBeLessThanOrEqual(160);
  });

  it("builds homepage titles as brand plus business scope", () => {
    expect(buildHomeMetadataTitle("en", "ENHE AI")).toBe(
      "ENHE AI | AI Tools, News, Account Services & Courses",
    );
    expect(buildHomeMetadataTitle("zh", "恩禾 ENHE AI")).toBe(
      "恩禾 ENHE AI | AI工具、AI资讯、账号服务与技能课程",
    );

    const chineseDescription = buildHomeMetaDescription("zh");
    const englishDescription = buildHomeMetaDescription("en");
    expect(chineseDescription).toContain("真实任务");
    expect(chineseDescription).toContain("AI 工具");
    expect(chineseDescription.length).toBeLessThanOrEqual(150);
    expect(englishDescription).toContain("real tasks");
    expect(englishDescription).toContain("AI");
    expect(englishDescription.length).toBeLessThanOrEqual(155);
    expect(
      buildHomeMetaDescription(
        "en",
        "Live in symbiosis with artificial intelligence, awaken in this era, and define a more productive future through thoughtful creation and collaboration.",
      ),
    ).toContain("real tasks");
  });

  it("assigns one explicit primary search title to verified revenue pages", () => {
    expect(
      getRevenuePageSeoTitle("infinitetalk-ai", "zh"),
    ).toBe("InfiniteTalk AI数字人口播");
    expect(
      getRevenuePageSeoTitle("ai-prompt-management", "zh"),
    ).toBe("AI提示词管理教程");
    expect(
      getRevenuePageSeoTitle(
        "ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
        "zh",
      ),
    ).toBe("418双语提示词 AI提示词管理工具");
    const mappedTitle = buildToolMetadataTitle({
      name: getRevenuePageSeoTitle("infinitetalk-ai", "zh") ?? "",
      brand: "恩禾 ENHE AI",
      locale: "zh",
      maxLength: 38,
    });
    expect(mappedTitle.length).toBeLessThanOrEqual(38);
    expect(mappedTitle).toContain("InfiniteTalk");
    expect(mappedTitle).toContain("AI数字人口播");
    expect(getRevenuePageSeoTitle("unknown-product", "zh")).toBeUndefined();
  });

  it("uses one stable ENHE AI organization entity and rejects internal sameAs URLs", () => {
    const schema = buildOrganizationSchema({
      name: "ENHE AI",
      sameAs: [
        "https://www.enhe-tech.com.cn/about",
        "https://example.com/enhe-ai",
      ],
    });

    expect(schema["@id"]).toBe("https://www.enhe-tech.com.cn/#organization");
    expect(schema.name).toBe("ENHE AI");
    expect(schema.sameAs).toEqual(["https://example.com/enhe-ai"]);
  });

  it("builds stronger meta descriptions for core public pages", () => {
    const coreDescriptions = [
      buildHomeMetaDescription("zh"),
      buildHomeMetaDescription("en"),
      buildListingMetaDescription("software", "zh"),
      buildListingMetaDescription("account-services", "zh"),
      buildListingMetaDescription("skill-learning", "zh"),
      buildListingMetaDescription("pricing", "zh"),
      buildListingMetaDescription("software", "en"),
      buildListingMetaDescription("account-services", "en"),
      buildListingMetaDescription("skill-learning", "en"),
      buildListingMetaDescription("pricing", "en")
    ];

    for (const description of coreDescriptions.slice(0, 6)) {
      expect(description.length).toBeGreaterThanOrEqual(75);
      expect(description.length).toBeLessThanOrEqual(150);
    }
    for (const description of coreDescriptions.slice(6)) {
      expect(description.length).toBeGreaterThanOrEqual(95);
      expect(description.length).toBeLessThanOrEqual(150);
    }
    expect(buildListingMetaDescription("pricing", "zh")).toContain("报价");
    expect(buildListingMetaDescription("software", "en")).toContain("AI software");
  });

  it("keeps listing meta descriptions above short-snippet crawler thresholds", () => {
    const kinds = [
      "software",
      "account-services",
      "skill-learning",
      "ai-news",
      "pricing",
      "tutorials",
    ] as const;

    for (const kind of kinds) {
      const zhDescription = buildListingMetaDescription(kind, "zh");
      const enDescription = buildListingMetaDescription(kind, "en");

      expect(zhDescription.length).toBeGreaterThanOrEqual(90);
      expect(zhDescription.length).toBeLessThanOrEqual(150);
      expect(enDescription.length).toBeGreaterThanOrEqual(120);
      expect(enDescription.length).toBeLessThanOrEqual(150);
    }
  });

  it("expands short topic descriptions for metadata without changing page copy", () => {
    const zhDescription = buildTopicMetaDescription({
      title: "AI content creation tools",
      description: "Short topic guide.",
      locale: "zh",
      kind: "ai-topic",
    });
    const enDescription = buildTopicMetaDescription({
      title: "AI Tools",
      description: "A short AI tool topic.",
      locale: "en",
      kind: "ai-news-topic",
    });

    expect(zhDescription.length).toBeGreaterThanOrEqual(80);
    expect(zhDescription.length).toBeLessThanOrEqual(150);
    expect(zhDescription).toContain("ENHE AI");
    expect(enDescription.length).toBeGreaterThanOrEqual(110);
    expect(enDescription.length).toBeLessThanOrEqual(150);
    expect(enDescription).toContain("sources");
  });

  it("enriches short detail page descriptions with intent and conversion context", () => {
    const chineseDescription = buildToolMetaDescription({
      name: "即梦AI",
      englishName: "Dreamina",
      description: "AI创作工具。",
      brand: "ENHE AI",
      locale: "zh",
      type: "software"
    });
    const englishDescription = buildToolMetaDescription({
      name: "Dreamina",
      description: "AI creation tool.",
      brand: "ENHE AI",
      locale: "en",
      type: "software"
    });

    expect(chineseDescription.length).toBeGreaterThanOrEqual(60);
    expect(chineseDescription).toContain("价格");
    expect(chineseDescription).toContain("教程");
    expect(englishDescription.length).toBeGreaterThanOrEqual(95);
    expect(englishDescription).toContain("pricing");
    expect(englishDescription).toContain("ENHE AI");
  });

  it("turns short Chinese commercial descriptions into natural bounded sentences", () => {
    const description = buildToolMetaDescription({
      name: "聊天截图素材制作｜无需代码",
      englishName: "No-Code Chat Screenshot Maker",
      description: "快速制作可编辑的手机聊天截图素材，适合剧情、课程和原型",
      brand: "恩禾 ENHE AI",
      locale: "zh",
      type: "software",
    });

    expect(description).toMatch(/^快速制作可编辑的手机聊天截图素材，适合剧情、课程和原型。/);
    expect(description).not.toContain("原型 在");
    expect(description).not.toContain("在 恩禾 ENHE AI 查看");
    expect(description).not.toMatch(/查看[^。]*价格/);
    expect(description).toContain("价格");
    expect(description).toContain("教程");
    expect(description).toContain("恩禾 ENHE AI");
    expect(description).toMatch(/[。！？]$/);
    expect(description.length).toBeLessThanOrEqual(120);
  });

  it("keeps longer Chinese commercial facts without appending a long template", () => {
    const description = buildToolMetaDescription({
      name: "FaceSwap Studio｜本地人像合成研究工具",
      description:
        "适合需要人物素材处理、换脸预览和创作草稿的用户，重点是降低素材外传顾虑，并把生成流程放进可重复的本地工作流。",
      brand: "恩禾 ENHE AI",
      locale: "zh",
      type: "software",
    });

    expect(description).toContain("降低素材外传顾虑");
    expect(description).not.toContain("在 恩禾 ENHE AI 查看");
    expect(description.length).toBeLessThanOrEqual(120);
  });

  it("punctuates controlled-workflow product descriptions naturally", () => {
    const description = buildToolMetaDescription({
      name: "InfiniteTalk：本地 AI 数字人口播视频生成工具",
      description: "一张图片即可生成数字人视频，本地部署处理素材",
      brand: "恩禾 ENHE AI",
      locale: "zh",
      type: "software",
    });

    expect(description).toContain("生成工具，适合");
    expect(description.length).toBeLessThanOrEqual(120);
  });

  it("keeps account-service detail descriptions long enough when generic safe copy is used", () => {
    const description = buildToolMetaDescription({
      name: "Gemini Pro",
      englishName: "Gemini Pro",
      description:
        "AI工具订阅与账号使用支持，提供订阅咨询、账号使用建议、交付说明与售后边界。使用前请遵守对应平台规则；如涉及第三方平台，请以官方政策为准。",
      type: "online",
      locale: "zh",
    });

    expect(description).toContain("Gemini Pro");
    expect(description.length).toBeGreaterThanOrEqual(80);
    expect(description.length).toBeLessThanOrEqual(145);
  });

  it("rewrites risky local-deployment detail copy into user-first safety and privacy language", () => {
    const description = buildToolMetaDescription({
      name: "AI视频生成终极版",
      description: "本地部署AI大模型，不受限制，能够随心所欲的生成视频",
      brand: "ENHE AI",
      locale: "zh",
      type: "software"
    });

    expect(description).toContain("安全");
    expect(description).toContain("隐私");
    expect(description).toContain("稳定");
    expect(description).toContain("可控");
    expect(description).not.toContain("不受限制");
    expect(description).not.toContain("随心所欲");
    expect(description).not.toContain("功能亮点、价格、教程、访问方式与适用场景");
    expect(description.length).toBeLessThanOrEqual(145);
  });
});
