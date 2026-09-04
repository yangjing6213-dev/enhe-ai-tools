import { describe, expect, it } from "vitest";
import {
  buildLocalizedNewsKeywordList,
  buildLocalizedNewsSummary,
  buildLocalizedNewsTitle,
  localizeAiNewsDiscoveryLabel,
  buildLocalizedTutorialPreviewTitle,
  buildLocalizedTutorialPreviewToolName,
  resolveLocalizedNewsCategoryName,
  resolveLocalizedNewsTagName
} from "@/lib/ai-news-localization";

describe("AI news localization helpers", () => {
  it("maps english news categories and tags away from raw chinese labels", () => {
    expect(resolveLocalizedNewsCategoryName("AI资讯", "en")).toBe("AI News");
    expect(resolveLocalizedNewsCategoryName("趋势解读", "en")).toBe("Trend Insights");
    expect(resolveLocalizedNewsTagName("AI教程", "en")).toBe("AI Tutorials");
    expect(resolveLocalizedNewsTagName("自动化", "en")).toBe("Automation");
    expect(resolveLocalizedNewsTagName("Agent", "en")).toBe("Agent");
  });

  it("builds english news summaries and keywords without leaking chinese copy", () => {
    const summary = buildLocalizedNewsSummary(
      {
        title: "中文标题",
        englishTitle: "OpenAI Agent Update",
        summary: "中文摘要",
        englishSummary: null,
        description: "中文描述",
        englishDescription: "OpenAI updates its agent workflow so teams can move from model output to production tasks more quickly."
      },
      "en"
    );

    const keywords = buildLocalizedNewsKeywordList(
      {
        keywords: "AI资讯,AI趋势,AI工具,AI教程,ENHE AI",
        seoKeywords: null,
        englishKeywords: null,
        englishSeoKeywords: null,
        categoryName: "AI资讯",
        tagNames: ["自动化", "效率"]
      },
      "en"
    );

    expect(summary).toContain("OpenAI updates its agent workflow");
    expect(summary).not.toContain("中文");
    expect(keywords).toEqual(
      expect.arrayContaining(["AI News", "AI Trends", "AI Tools", "AI Tutorials", "ENHE AI", "Automation", "Productivity"])
    );
    expect(keywords.join(" ")).not.toMatch(/[\u3400-\u9fff]/);
  });

  it("builds english tutorial preview labels for related content cards", () => {
    expect(
      buildLocalizedTutorialPreviewTitle(
        "使用步骤",
        {
          slug: "chatgpt-plus",
          name: "ChatGPT Plus账号服务",
          englishName: "ChatGPT Plus",
          type: "online"
        },
        "en"
      )
    ).toBe("ChatGPT Plus guide");

    expect(
      buildLocalizedTutorialPreviewToolName(
        {
          slug: "chatgpt-plus",
          name: "ChatGPT Plus账号服务",
          englishName: "ChatGPT Plus",
          type: "online"
        },
        "en"
      )
    ).toBe("ChatGPT Plus");
  });

  it("builds a readable english fallback title when english fields are missing", () => {
    expect(
      buildLocalizedNewsTitle(
        {
          title: "中文标题",
          englishTitle: null,
          categoryName: "AI资讯"
        },
        "en"
      )
    ).toBe("AI News Update");
  });

  it("localizes AI news discovery labels on English pages", () => {
    expect(localizeAiNewsDiscoveryLabel("AI资讯", "en", "AI Insights")).toBe("AI News");
    expect(localizeAiNewsDiscoveryLabel("趋势解读", "en", "AI Insights")).toBe("Trend Insights");
    expect(localizeAiNewsDiscoveryLabel("工具落地", "en", "AI Insights")).toBe("Tool Workflows");
    expect(localizeAiNewsDiscoveryLabel("OpenAI", "en", "AI Insights")).toBe("OpenAI");
  });
});
