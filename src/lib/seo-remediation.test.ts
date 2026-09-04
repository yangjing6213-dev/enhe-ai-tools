import { describe, expect, it } from "vitest";
import {
  buildAiNewsDescriptionFallback,
  resolveAiNewsMetaDescription,
} from "@/lib/ai-news";
import {
  buildHomeMetaDescription,
  buildToolMetaDescription,
  buildToolMetadataTitle,
  sanitizeAccountServiceCopy,
} from "@/lib/seo";
import {
  buildLocalizedToolFaqItems,
  buildLocalizedToolLongContent,
  buildLocalizedToolMetaDescription,
  buildLocalizedToolMetaHeading,
  buildLocalizedToolOfferName,
  buildLocalizedToolPreviewText,
  resolveLocalizedToolCategoryName,
  buildLocalizedToolSummary,
  resolveLocalizedToolIdentity,
} from "@/lib/tool-localization";

describe("SEO remediation helpers", () => {
  it("does not fall back to the generic ENHE brand sentence for AI news descriptions", () => {
    const description = resolveAiNewsMetaDescription(
      [null, "", "2026-06-19"],
      "OpenAI workspace agents connect ChatGPT with team workflows, showing how AI agents can move from chat into practical execution.",
    );

    expect(description).toContain("OpenAI workspace agents");
    expect(description).not.toContain("Live in symbiosis with AI");
  });

  it("skips generic brand-slogan candidates when resolving AI news descriptions", () => {
    const description = resolveAiNewsMetaDescription(
      [
        "Live in symbiosis with AI, awaken in this era, and define the future through creation.",
      ],
      "OpenAI workspace agents connect ChatGPT with team workflows, showing how AI agents can move from chat into practical execution.",
    );

    expect(description).toContain("OpenAI workspace agents");
    expect(description).not.toContain("Live in symbiosis with AI");
  });

  it("uses article fallback when candidates and source summaries are generic brand slogans", () => {
    const fallback = buildAiNewsDescriptionFallback({
      title: "OpenAI workspace agents connect ChatGPT with team workflows",
      categoryName: "AI Agent",
      locale: "en",
    });
    const description = resolveAiNewsMetaDescription(
      [
        "Live in symbiosis with AI, awaken in this era, and define the future through creation.",
      ],
      fallback,
    );

    expect(description).toContain("OpenAI workspace agents");
    expect(description).not.toContain("Live in symbiosis with AI");
  });

  it("builds an article-specific AI news fallback when description fields are empty or date-only", () => {
    const fallback = buildAiNewsDescriptionFallback({
      title: "OpenAI workspace agents connect ChatGPT with team workflows",
      categoryName: "AI Agent",
      locale: "en",
    });
    const description = resolveAiNewsMetaDescription(
      [null, "", "2026-06-19"],
      fallback,
    );

    expect(description).toContain("OpenAI workspace agents");
    expect(description).toContain("ENHE AI");
    expect(description).not.toContain("Live in symbiosis with AI");
  });

  it("builds fuller homepage descriptions for search snippets", () => {
    const zhDescription = buildHomeMetaDescription("zh");
    const enDescription = buildHomeMetaDescription("en");

    expect(zhDescription.length).toBeGreaterThanOrEqual(70);
    expect(zhDescription).toContain("AI前沿资讯");
    expect(zhDescription).toContain("AI软件应用");
    expect(enDescription.length).toBeGreaterThanOrEqual(120);
    expect(enDescription).toContain("AI news");
    expect(enDescription).toContain("account service");
  });

  it("sanitizes account-service compliance risk copy before rendering or using it in metadata", () => {
    const unsafe =
      "提供账号 + 密码，低价稳定，永久可用，目前无封号、无掉订阅反馈，可充值。";
    const safe = sanitizeAccountServiceCopy(unsafe);

    for (const risky of [
      "账号 + 密码",
      "低价稳定",
      "永久可用",
      "无封号",
      "掉订阅",
      "充值",
    ]) {
      expect(safe).not.toContain(risky);
    }
    expect(safe).toContain("AI工具订阅与账号使用支持");
    expect(safe).toContain("官方政策为准");
  });

  it("uses sanitized account-service copy in localized summaries, previews, long content, and metadata", () => {
    const tool = {
      slug: "gemini-pro",
      name: "Gemini Pro（一年订阅期）",
      englishName: "Gemini Pro account support",
      shortDescription: "提供账号 + 密码，低价稳定，目前无封号、无掉订阅反馈。",
      content: "这是一个共享账号服务，承诺永久可用，可充值。",
      type: "online" as const,
      categoryName: "AI账号服务",
    };

    const outputs = [
      buildLocalizedToolSummary(tool, "zh"),
      buildLocalizedToolPreviewText(tool, "zh"),
      buildLocalizedToolLongContent(tool, "zh"),
      buildLocalizedToolMetaDescription(tool, "zh"),
      buildToolMetaDescription({
        name: tool.name,
        englishName: tool.englishName,
        description: buildLocalizedToolMetaDescription(tool, "zh"),
        type: "online",
        locale: "zh",
      }),
    ];

    for (const output of outputs) {
      expect(output).toContain("AI工具订阅与账号使用支持");
      for (const risky of [
        "账号 + 密码",
        "低价稳定",
        "共享账号",
        "永久可用",
        "无封号",
        "掉订阅",
        "充值",
      ]) {
        expect(output).not.toContain(risky);
      }
    }
  });

  it("sanitizes account-service names and offer labels before public rendering", () => {
    const tool = {
      slug: "chatgpt-plus-100",
      name: "ChatGPT Plus 官方代充稳定不封号 100% 低价稳定",
      englishName:
        "Subscription Recharge Service - Legitimate Channel, Warranty Included, Stable Membership Access",
      shortDescription: "提供账号 + 密码，低价稳定，目前无封号、无掉订阅反馈。",
      content: "这是一个共享账号服务，承诺永久可用，可充值。",
      type: "online" as const,
      categoryName: "AI账号服务",
    };

    const identity = resolveLocalizedToolIdentity(tool, "zh");
    const heading = buildLocalizedToolMetaHeading(tool, "zh");
    const offerName = buildLocalizedToolOfferName(
      "官方代充充值套餐，保证不封号",
      "online",
      "zh",
      0,
    );

    expect(identity.primaryName).toBe("ChatGPT Plus AI账号服务咨询");
    expect(identity.secondaryName).toBe("");
    expect(heading).toBe("ChatGPT Plus AI账号服务咨询");
    expect(offerName).toBe("AI账号服务咨询方案 1");

    for (const output of [identity.primaryName, heading, offerName]) {
      for (const risky of [
        "官方代充",
        "代充",
        "充值",
        "不封号",
        "低价稳定",
        "Recharge",
      ]) {
        expect(output).not.toContain(risky);
      }
    }
  });

  it("sanitizes production account-service warranty names and recharge categories", () => {
    const tool = {
      slug: "gemini-pro",
      name: "Gemini Pro（一年订阅期）【质保一个月】成品号/非学生",
      englishName: "Gemini Pro",
      shortDescription: "AI工具订阅与账号使用支持。",
      content: "AI工具订阅与账号使用支持。",
      type: "online" as const,
      categoryName: "账号代充服务",
    };

    const identity = resolveLocalizedToolIdentity(tool, "zh");
    const category = resolveLocalizedToolCategoryName(
      tool.categoryName,
      tool.type,
      "zh",
    );

    expect(identity.primaryName).toBe("Gemini Pro AI账号服务咨询");
    expect(identity.secondaryName).toBe("Gemini Pro");
    expect(category).toBe("AI账号服务咨询");

    for (const output of [identity.primaryName, category]) {
      for (const risky of ["质保", "成品号", "学生", "非学生", "代充"]) {
        expect(output).not.toContain(risky);
      }
    }
  });

  it("sanitizes visible account-service titles with official, exclusive, and stability claims", () => {
    const outputs = [
      resolveLocalizedToolIdentity(
        {
          slug: "gmail-google",
          name: "Gmail 邮箱 | 稳定收发邮件 | 支持Google生态通用",
          englishName: null,
          type: "online",
        },
        "zh",
      ).primaryName,
      resolveLocalizedToolIdentity(
        {
          slug: "gemini-pro",
          name: "官方Gemini Pro（Google AI Pro）独享账号 | 3个月",
          englishName: null,
          type: "online",
        },
        "zh",
      ).primaryName,
      resolveLocalizedToolCategoryName("官方账号与稳定服务", "online", "zh"),
    ];

    for (const output of outputs) {
      expect(output).toContain("AI");
      for (const risky of ["官方", "独享", "稳定收发", "稳定"]) {
        expect(output).not.toContain(risky);
      }
    }
  });

  it("provides FAQ fallback items for Chinese account services so FAQPage schema can render", () => {
    const faqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "gemini-pro",
        name: "Gemini Pro",
        englishName: "Gemini Pro account support",
        shortDescription: "AI工具订阅与账号使用支持。",
        content: "",
        type: "online",
        categoryName: "AI账号服务",
      },
      "zh",
    );

    expect(faqs.length).toBeGreaterThanOrEqual(2);
    expect(faqs[0].question).toContain("服务");
    expect(faqs[0].answer).toContain("平台规则");
  });

  it("sanitizes existing Chinese account-service FAQ answers before rendering schema or page copy", () => {
    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-unsafe",
          question: "Service stability?",
          answer: "Shared account, guaranteed no ban, recharge supported.",
        },
      ],
      {
        slug: "gemini-pro",
        name: "Gemini Pro",
        englishName: "Gemini Pro account support",
        shortDescription: "AI account support.",
        content: "",
        type: "online",
        categoryName: "AI account service",
      },
      "zh",
    );

    expect(faqs[0].answer).toContain("AI工具订阅与账号使用支持");
    expect(faqs[0].answer).not.toContain("Shared account");
    expect(faqs[0].answer).not.toContain("guaranteed");
    expect(faqs[0].answer).not.toContain("recharge");
  });

  it("keeps English titles under the search snippet target length", () => {
    const title = buildToolMetadataTitle({
      name: "Mobile Chat Screenshot Maker No Code Required, Easy to Use Ultimate Version - AI Software App",
      brand: "ENHE AI",
      locale: "en",
    });

    expect(title.length).toBeLessThanOrEqual(62);
    expect(title.endsWith(" | ENHE AI")).toBe(true);
  });
});
