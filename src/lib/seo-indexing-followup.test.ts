import { describe, expect, it } from "vitest";
import { generateLoginPageMetadata } from "@/app/(auth)/login/page-shell";
import { generateAiNewsPageMetadata } from "@/app/ai-news/page-shell";
import { buildAiNewsSerpTitle } from "@/lib/ai-news";
import { shouldIndexEnglishToolPage } from "@/lib/tool-localization";

describe("SEO indexing follow-up", () => {
  it("keeps long English AI news titles unique after SERP truncation", () => {
    const titles = [
      "How ENHE AI Helps Users Understand Claude-Style AI Workflows",
      "How ENHE AI Helps Users Understand Claude Science and AI Workbenches",
      "How ENHE AI Helps Users Understand Claude Code and AI Code Security Governance",
      "How ENHE AI Helps Users Understand Claude Reflect and AI Skill Reflection",
      "How ENHE AI Helps Users Understand Claude and Physical AI Workflows",
      "How ENHE AI Helps Users Understand Copilot, BYOK, and AI Credit Governance",
      "How ENHE AI Helps Users Understand Copilot App and Desktop AI Agents",
      "How ENHE AI Helps Users Understand Copilot OTel and Agent Governance",
    ];

    const serpTitles = titles.map((title) =>
      buildAiNewsSerpTitle({
        title,
        categoryName: "AI News",
        locale: "en",
        maxLength: 58,
      }),
    );

    expect(serpTitles[0]).toBe("Claude-Style AI Workflows Impact Analysis");
    expect(new Set(serpTitles).size).toBe(titles.length);
  });

  it("gives AI news pagination unique metadata and self-canonical alternates", async () => {
    const metadata = await generateAiNewsPageMetadata("en", { page: "2" });

    expect(metadata.title).toContain("Page 2");
    expect(metadata.description).toContain("Page 2");
    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/en/ai-news?page=2",
    );
    expect(metadata.alternates?.languages).toEqual({
      "x-default": "https://www.enhe-tech.com.cn/ai-news?page=2",
      "zh-CN": "https://www.enhe-tech.com.cn/ai-news?page=2",
      "en-US": "https://www.enhe-tech.com.cn/en/ai-news?page=2",
    });
  });

  it("keeps filtered AI news listings non-indexable on the root canonical", async () => {
    const metadata = await generateAiNewsPageMetadata("zh", {
      page: "2",
      q: "agent",
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/ai-news",
    );
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("allows the five reviewed English course and account pages to be indexed", () => {
    const reviewedPages = [
      ["gmail-google", "online", "Gmail and Google Ecosystem Account Guidance"],
      [
        "chatgpt-codex-dalle",
        "online",
        "ChatGPT Usage Guidance for Codex and DALL-E",
      ],
      ["chatgpt-plus-100", "online", "ChatGPT Plus Subscription Guidance"],
      ["ai-ai-ilo5a5", "skill_learning", "Practical AI Side Project Course"],
      [
        "ai-at8nui",
        "skill_learning",
        "High-Frequency AI Prompts for Work, Learning, and Teaching",
      ],
    ] as const;

    for (const [slug, type, englishName] of reviewedPages) {
      expect(
        shouldIndexEnglishToolPage({
          slug,
          name: "中文产品名称",
          englishName,
          shortDescription:
            "这是面向中文用户的产品摘要，说明适用范围、使用方式和服务边界。",
          content:
            "这是中文产品详情，包含交付流程、使用步骤、注意事项和常见问题。",
          type,
        }),
      ).toBe(true);
    }
  });

  it("adds localized self-canonicals while keeping login pages out of the index", () => {
    const zhMetadata = generateLoginPageMetadata("zh");
    const enMetadata = generateLoginPageMetadata("en");

    expect(zhMetadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/login",
    );
    expect(enMetadata.alternates?.canonical).toBe(
      "https://www.enhe-tech.com.cn/en/login",
    );
    expect(zhMetadata.robots).toEqual({ index: false, follow: true });
    expect(enMetadata.robots).toEqual({ index: false, follow: true });
  });
});
