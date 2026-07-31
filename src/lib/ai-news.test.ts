import { describe, expect, it } from "vitest";
import {
  buildAiNewsDescriptionFallback,
  buildAiNewsRelatedKeywords,
  buildAiNewsSerpTitle,
  truncateAiNewsMetaDescription,
  getNewsPageCount,
  hasActiveNewsFilters,
  mergeAiNewsRelatedItems,
  extractNewsTableOfContents,
  isUsableEnglishNewsText,
  isEnglishNewsArticleIndexable,
  maxEnglishNewsHanCharacterRatio,
  maxIncidentalEnglishNewsHanCharacters,
  parseNewsRelationIds,
  parseNewsSearchParams,
  renderNewsContentBlocks,
  resolveLocalizedNewsContent,
  resolveAiNewsMetadataTitle,
  resolveAiNewsMetaDescription,
  resolveNewsVideo,
  resolveAiNewsCanonicalSlug,
  resolveNewsSlug,
  toNewsIsoDate,
} from "@/lib/ai-news";
import { buildMetadataTitle } from "@/lib/seo";

describe("AI news helpers", () => {
  it("calculates stable pagination and detects filtered result pages", () => {
    expect(getNewsPageCount(0)).toBe(1);
    expect(getNewsPageCount(9)).toBe(1);
    expect(getNewsPageCount(10)).toBe(2);
    expect(
      hasActiveNewsFilters({ sort: "latest" }),
    ).toBe(false);
    expect(
      hasActiveNewsFilters({ q: "agent", sort: "latest" }),
    ).toBe(true);
    expect(
      hasActiveNewsFilters({ sort: "hot" }),
    ).toBe(true);
  });

  it("resolves clean slugs with a stable fallback", () => {
    expect(
      resolveNewsSlug({
        title: "OpenAI Agent Update",
        slugInput: "",
        fallbackSeed: "abc",
      }),
    ).toBe("openai-agent-update");
    expect(
      resolveNewsSlug({
        title: "中文标题",
        slugInput: "",
        fallbackSeed: "abc",
      }),
    ).toBe("news-abc");
    expect(
      resolveNewsSlug({
        title: "Ignored",
        slugInput: "AI 视频 2026",
        fallbackSeed: "abc",
      }),
    ).toBe("ai-2026");
  });

  it("builds canonical AI news slugs from english titles before keeping weak legacy slugs", () => {
    expect(
      resolveAiNewsCanonicalSlug({
        slug: "ai-news-trend-insights-launch",
        title: "中文标题",
        englishTitle: "OpenAI Agent Workflow Update",
      }),
    ).toBe("openai-agent-workflow-update");

    expect(
      resolveAiNewsCanonicalSlug({
        slug: "news-abc",
        title: "中文标题",
        englishTitle: null,
      }),
    ).toBe("news-abc");
  });

  it("parses search params with safe defaults", () => {
    expect(
      parseNewsSearchParams({
        q: "  agent ",
        page: "3",
        sort: "hot",
        category: "cat",
        tag: "tag",
      }),
    ).toEqual({
      q: "agent",
      page: 3,
      pageSize: 9,
      skip: 18,
      sort: "hot",
      category: "cat",
      tag: "tag",
    });
    expect(
      parseNewsSearchParams({ page: "-2", sort: "unknown" }),
    ).toMatchObject({
      page: 1,
      skip: 0,
      sort: "latest",
    });
  });

  it("extracts H2 and H3 headings for a table of contents", () => {
    const toc = extractNewsTableOfContents(
      "## 发生了什么？\n正文\n### 对普通用户\n## 总结",
    );

    expect(toc).toEqual([
      { id: "section-1", level: 2, title: "发生了什么？" },
      { id: "section-2", level: 3, title: "对普通用户" },
      { id: "section-3", level: 2, title: "总结" },
    ]);
  });

  it("renders safe content blocks and escapes raw html", () => {
    const blocks = renderNewsContentBlocks(
      "## 标题\n<script>alert(1)</script>\n- 要点\n> 引用",
    );

    expect(blocks).toEqual([
      { type: "heading", level: 2, id: "section-1", text: "标题" },
      { type: "paragraph", text: "&lt;script&gt;alert(1)&lt;/script&gt;" },
      { type: "list", ordered: false, items: ["要点"] },
      { type: "quote", text: "引用" },
    ]);
  });

  it("renders markdown image blocks with safe alt text, source and caption", () => {
    const blocks = renderNewsContentBlocks(
      '## 媒体解读\n![AI智能体工作流看板](https://images.unsplash.com/photo-agent-dashboard "AI智能体工作流示意图")\n正文继续。',
    );

    expect(blocks).toEqual([
      { type: "heading", level: 2, id: "section-1", text: "媒体解读" },
      {
        type: "image",
        src: "https://images.unsplash.com/photo-agent-dashboard",
        alt: "AI智能体工作流看板",
        caption: "AI智能体工作流示意图",
      },
      { type: "paragraph", text: "正文继续。" },
    ]);
  });

  it("renders safe internal markdown links in paragraph and list blocks", () => {
    const blocks = renderNewsContentBlocks(
      "正文可查看 [AI软件应用](/software) 和 [AI账号服务](https://www.enhe-tech.com.cn/account-services)。\n- 学习 [AI技能教程](/skill-learning)\n- 忽略 [外部链接](https://example.com/bad)",
    );

    expect(blocks).toEqual([
      {
        type: "paragraph",
        parts: [
          { type: "text", text: "正文可查看 " },
          { type: "link", href: "/software", text: "AI软件应用" },
          { type: "text", text: " 和 " },
          { type: "link", href: "/account-services", text: "AI账号服务" },
          { type: "text", text: "。" },
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [
          {
            parts: [
              { type: "text", text: "学习 " },
              { type: "link", href: "/skill-learning", text: "AI技能教程" },
            ],
          },
          "忽略 外部链接",
        ],
      },
    ]);
  });

  it("builds deduped related keywords without generic automation tags", () => {
    expect(
      buildAiNewsRelatedKeywords({
        title: "OpenAI 智能体进入工作区",
        keywords: "AI智能体, AI工作流自动化, AI",
        seoKeywords: "AI工作流自动化, 账号安全",
        categoryName: "AI快讯",
        tagNames: ["AI资讯", "自动发布", "AI智能体", "AI账号安全"],
      }),
    ).toEqual(["AI智能体", "AI账号安全", "AI工作流自动化", "账号安全"]);
  });

  it("merges related items by priority while removing duplicates and capping the result", () => {
    const explicit = [{ id: "tool-a" }, { id: "tool-b" }];
    const keywordMatched = [{ id: "tool-b" }, { id: "tool-c" }];
    const fallback = [{ id: "tool-d" }, { id: "tool-e" }];

    expect(
      mergeAiNewsRelatedItems([explicit, keywordMatched, fallback], 4),
    ).toEqual([
      { id: "tool-a" },
      { id: "tool-b" },
      { id: "tool-c" },
      { id: "tool-d" },
    ]);
  });

  it("resolves safe article video links with fallback titles", () => {
    expect(
      resolveNewsVideo(
        {
          videoUrl: "https://www.youtube.com/watch?v=agent-demo",
          videoTitle: "AI智能体工作流演示",
          videoDescription: "展示团队如何理解 AI 工作流自动化。",
        },
        "文章标题",
      ),
    ).toEqual({
      url: "https://www.youtube.com/watch?v=agent-demo",
      title: "AI智能体工作流演示",
      description: "展示团队如何理解 AI 工作流自动化。",
    });

    expect(
      resolveNewsVideo(
        { videoUrl: "javascript:alert(1)", videoTitle: "Bad" },
        "文章标题",
      ),
    ).toBeNull();
    expect(
      resolveNewsVideo(
        { videoUrl: "https://example.com/video", videoTitle: "" },
        "文章标题",
      ),
    ).toEqual({
      url: "https://example.com/video",
      title: "文章标题",
    });
  });

  it("guards English indexing when translated content is too thin", () => {
    expect(
      isEnglishNewsArticleIndexable({
        englishTitle: "AI news",
        englishSummary: "Short",
        englishContent: "Tiny",
      }),
    ).toBe(false);
    expect(
      isEnglishNewsArticleIndexable({
        englishTitle: "OpenAI releases a practical agent update",
        englishSummary:
          "A concise summary for English readers that explains workflow impact and practical next steps.",
        englishContent:
          "This update matters because it changes how teams can connect model capabilities with everyday workflows, review practical impact, compare related tools, and decide what workflow should be tested next. ".repeat(
            3,
          ),
      }),
    ).toBe(true);
  });

  it("rejects mixed Chinese fallback content on English AI news routes", () => {
    expect(
      isEnglishNewsArticleIndexable({
        englishTitle: "OpenAI workspace agents update",
        englishSummary:
          "This summary is readable for English users and explains the practical workflow impact.",
        englishContent:
          "This English-looking introduction is followed by 中文正文, which means the page should not be indexed as English.",
      }),
    ).toBe(false);
  });

  it("allows Chinese brand names in otherwise valid English news content", () => {
    expect(
      isEnglishNewsArticleIndexable({
        englishTitle: "Alibaba \u901a\u4e49\u5343\u95ee releases a practical model update",
        englishSummary:
          "The Alibaba model update changes workflow choices for English readers and gives teams concrete compatibility checks.",
        englishContent:
          "The \u901a\u4e49\u5343\u95ee update matters because teams need to compare supported models, review account and data boundaries, test one representative workflow, record the result, and decide whether an upgrade is appropriate. ".repeat(
            3,
          ),
      }),
    ).toBe(true);
  });

  it("allows quoted Chinese source names in otherwise complete English articles", () => {
    expect(
      isEnglishNewsArticleIndexable({
        englishTitle: "Global AI agent trust and interoperability initiative",
        englishSummary:
          "The initiative explains identity, discovery, privacy, security, and cross-platform execution for AI agents.",
        englishContent: `${"This English analysis explains the source facts, workflow impact, governance boundaries, and practical checks for users. ".repeat(8)} Official source: 推动全球智能体互信互联互通合作倡议.`,
      }),
    ).toBe(true);
  });

  it("allows dispersed short Han brand names but rejects a continuous nine-character run", () => {
    expect(maxIncidentalEnglishNewsHanCharacters).toBe(8);
    expect(maxEnglishNewsHanCharacterRatio).toBe(0.05);
    expect(
      isUsableEnglishNewsText(
        "OpenAI model workflow update \u901a\u4e49\u5343\u95ee\u6587\u5fc3\u4e00\u8a00",
        4,
      ),
    ).toBe(true);
    expect(
      isUsableEnglishNewsText(
        "OpenAI model workflow update \u901a\u4e49\u5343\u95ee\u6587\u5fc3\u4e00\u8a00\u4e91",
        4,
      ),
    ).toBe(false);
    expect(
      isUsableEnglishNewsText(
        `${"This English workflow context remains detailed and actionable. ".repeat(8)}\u901a\u4e49\u5343\u95ee, \u6587\u5fc3\u4e00\u8a00, \u817e\u8baf\u6df7\u5143`,
        40,
      ),
    ).toBe(true);
    expect(
      isUsableEnglishNewsText(
        `${"This English workflow context remains detailed and actionable. ".repeat(8)}\u901a\u4e49\u5343\u95ee\u6587\u5fc3\u4e00\u8a00\u4e91`,
        40,
      ),
    ).toBe(false);
    expect(
      isUsableEnglishNewsText(
        `${"This English workflow context remains detailed and actionable. ".repeat(8)}${"\u4e2d".repeat(40)}`,
        40,
      ),
    ).toBe(false);
  });

  it("still rejects a substantial untranslated Chinese block", () => {
    expect(
      isUsableEnglishNewsText(
        `${"This English introduction explains the workflow impact and next steps. ".repeat(8)}\u8fd9\u662f\u4e00\u6bb5\u660e\u663e\u672a\u7ffb\u8bd1\u7684\u4e2d\u6587\u6b63\u6587\u5185\u5bb9\u5e76\u4e14\u4e0d\u5e94\u51fa\u73b0\u5728\u82f1\u6587\u9875\u9762`,
        45,
      ),
    ).toBe(false);
  });

  it("uses available English body content even when its layout differs from Chinese", () => {
    const chineseContent =
      "## 事实概述\n\n这是一段中文正文。\n\n![中文图](https://images.unsplash.com/photo-cn \"中文说明\")";
    const englishContent =
      "## Fact Summary\n\nThis English body explains the same AI news for English readers.\n\n- Track the source facts.\n- Compare practical workflow impact.";

    expect(resolveLocalizedNewsContent(chineseContent, englishContent, "en")).toBe(
      englishContent,
    );
    expect(resolveLocalizedNewsContent(chineseContent, englishContent, "zh")).toBe(
      chineseContent,
    );
    expect(resolveLocalizedNewsContent(chineseContent, "   ", "en")).toBe(
      chineseContent,
    );
  });

  it("skips date-only and thin fields when resolving SEO descriptions", () => {
    expect(
      resolveAiNewsMetaDescription(
        [
          "2026年6月18日",
          "Short",
          "A useful AI news summary that explains the practical value.",
        ],
        "Fallback",
      ),
    ).toBe("A useful AI news summary that explains the practical value.");
    expect(
      resolveAiNewsMetaDescription(
        ["2026-06-18", "Too short"],
        "Fallback summary with enough context",
      ),
    ).toBe("Fallback summary with enough context");
    expect(
      resolveAiNewsMetaDescription(
        ["2026年6月18日", "Too short"],
        "2026年6月18日",
      ),
    ).toBe("");
  });

  it("keeps a short valid AI news description without template padding", () => {
    const summary =
      "这是一条面向普通用户的AI资讯摘要，说明事件影响和下一步行动。";
    const description = resolveAiNewsMetaDescription(
      [summary],
      "阅读 ENHE AI 对“AI智能体安全边界”的资讯解读，了解发生了什么、为什么重要、对普通AI用户的实际影响、相关工具教程、来源线索、风险边界和下一步落地建议。",
    );

    expect(description).toBe(summary);
    expect(description).not.toContain("阅读 ENHE AI 对");
  });

  it("recognizes the current English fallback template without padding a valid summary", () => {
    const summary =
      "This update changes how creators plan AI workflows, review risks, and choose their next practical step.";
    const fallback = buildAiNewsDescriptionFallback({
      title: "OpenAI workspace agents connect team workflows",
      categoryName: "AI Agent",
      locale: "en",
    });

    expect(resolveAiNewsMetaDescription([summary], fallback)).toBe(summary);
  });

  it("prefers the locale-specific CMS SEO title", () => {
    expect(
      resolveAiNewsMetadataTitle({
        seoTitle: "涓枃 SEO 鏍囬",
        englishSeoTitle: "English CMS SEO title",
        localizedTitle: "Localized article title",
        locale: "en",
      }),
    ).toBe("English CMS SEO title");
    expect(
      resolveAiNewsMetadataTitle({
        seoTitle: "涓枃 SEO 鏍囬",
        englishSeoTitle: null,
        localizedTitle: "Localized article title",
        locale: "zh",
      }),
    ).toBe("涓枃 SEO 鏍囬");
  });

  it("does not repeat a full article title through the generated description fallback", () => {
    const title =
      "OpenAI 发布 GPT-5.6：面向创作者的多模态工作流与自动化能力全面升级";
    const summary =
      "这次更新重点影响内容创作效率、工具选择和工作流迁移。";
    const fallback = buildAiNewsDescriptionFallback({
      title,
      categoryName: "AI前沿资讯",
      locale: "zh",
    });
    const description = resolveAiNewsMetaDescription([summary], fallback);

    expect(description).toBe(summary);
    expect(description).not.toContain(title);
    expect(description).not.toContain("阅读 ENHE AI 对");
  });

  it("keeps an article-specific English fallback concise when no summary is usable", () => {
    const title =
      "OpenAI workspace agents connect ChatGPT with team workflows";
    const fallback = buildAiNewsDescriptionFallback({
      title,
      categoryName: "AI Agent",
      locale: "en",
    });

    expect(fallback).toContain(title);
    expect(fallback).toContain("ENHE AI");
    expect(fallback).not.toContain("Read ENHE AI's analysis of");
    expect(fallback.length).toBeGreaterThanOrEqual(80);
    expect(fallback.length).toBeLessThanOrEqual(135);
  });

  it("removes generic English news prefixes and analysis suffixes from SERP titles", () => {
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
        maxLength: 48,
      }),
    );

    expect(serpTitles[0]).toBe("Claude-Style AI Workflows");
    expect(serpTitles.every((title) => !/Impact Analysis$/i.test(title))).toBe(
      true,
    );
    expect(new Set(serpTitles).size).toBe(titles.length);
  });

  it("keeps composed Chinese and English news titles within their final brand budgets", () => {
    const cases = [
      {
        locale: "zh" as const,
        brand: "恩禾 ENHE AI",
        maxLength: 38,
        title:
          "OpenAI 发布 GPT-5.6：面向创作者的多模态工作流与自动化能力全面升级",
      },
      {
        locale: "en" as const,
        brand: "ENHE AI",
        maxLength: 58,
        title:
          "How ENHE AI Helps Users Understand OpenAI GPT-5.6 Creator Workflow Automation",
      },
    ];

    for (const item of cases) {
      const contentBudget = item.maxLength - ` | ${item.brand}`.length;
      const title = buildMetadataTitle({
        pageTitle: buildAiNewsSerpTitle({
          title: item.title,
          categoryName: "AI News",
          locale: item.locale,
          maxLength: contentBudget,
        }),
        brand: item.brand,
        maxLength: item.maxLength,
      });

      expect(title.length).toBeLessThanOrEqual(item.maxLength);
      expect(title).toContain(item.brand);
      expect(title).not.toMatch(/影响解读|Impact Analysis/i);
      expect(title).not.toMatch(/[|｜]\s*[|｜]/);
      expect(title).not.toMatch(/[：、，；。！？,:;.!?\-/]\s*\|/);
    }
  });

  it("truncates Chinese titles at natural punctuation without splitting English tokens", () => {
    expect(
      buildAiNewsSerpTitle({
        title:
          "OpenAI 发布 GPT-5.6：面向创作者的多模态工作流与自动化能力全面升级",
        locale: "zh",
        maxLength: 25,
      }),
    ).toBe("OpenAI 发布 GPT-5.6");

    expect(
      buildAiNewsSerpTitle({
        title: "本地部署 SuperLongModelVersion2026PreviewEdition 带来创作升级",
        locale: "zh",
        maxLength: 25,
      }),
    ).toBe("本地部署");
  });

  it("cleans repeated separators and dangling punctuation", () => {
    expect(
      buildAiNewsSerpTitle({
        title: "AI 视频工具 | | ：，",
        categoryName: "AI News",
        locale: "zh",
        maxLength: 25,
      }),
    ).toBe("AI 视频工具");
  });

  it("uses one ASCII token boundary rule for titles and descriptions", () => {
    const value =
      "ENHE AI workflow safeguards for Alpha@BetaSuperLongModelVersion2026PreviewEdition updates";
    const title = buildAiNewsSerpTitle({
      title: value,
      categoryName: "AI News",
      locale: "en",
      maxLength: 38,
    });
    const description = truncateAiNewsMetaDescription(value, 58);

    expect(title).not.toMatch(/Alpha@$/);
    expect(description).not.toMatch(/Alpha@$/);
    expect(title).not.toContain("Alpha@");
    expect(description).not.toContain("Alpha@");
  });

  it("removes dangling English stopwords after title and description truncation", () => {
    const value =
      "OpenAI agents coordinate workflows with secure model tools for creators";
    const title = buildAiNewsSerpTitle({
      title: value,
      categoryName: "AI News",
      locale: "en",
      maxLength: 43,
    });
    const description = truncateAiNewsMetaDescription(value, 43);

    expect(title).toBe("OpenAI agents coordinate workflows");
    expect(description).toBe("OpenAI agents coordinate workflows");
    expect(title).not.toMatch(/\b(?:and|for|of|the|to|with)$/i);
    expect(description).not.toMatch(/\b(?:and|for|of|the|to|with)$/i);
  });

  it("removes dangling Chinese conjunctions and English prepositions from SERP titles", () => {
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
        title: "OpenAI agents coordinate workflows via secure tools for creators",
        categoryName: "AI News",
        locale: "en",
        maxLength: 38,
      }),
    ).toBe("OpenAI agents coordinate workflows");
  });

  it("cleans dangling words even when the source title is already within the limit", () => {
    expect(
      buildAiNewsSerpTitle({
        title: "Kimi K3与",
        categoryName: "AI璧勮",
        locale: "zh",
        maxLength: 20,
      }),
    ).toBe("Kimi K3");
    expect(
      buildAiNewsSerpTitle({
        title: "OpenAI workflows via",
        categoryName: "AI News",
        locale: "en",
        maxLength: 30,
      }),
    ).toBe("OpenAI workflows");
  });

  it("does not expose an incomplete possessive ASCII token in a SERP title", () => {
    expect(
      buildAiNewsSerpTitle({
        title: "California's Anthropic deal changes AI governance",
        categoryName: "AI News",
        locale: "en",
        maxLength: 10,
      }),
    ).toBe("AI News");
  });

  it("prefers a complete phrase before natural punctuation for English titles", () => {
    expect(
      buildAiNewsSerpTitle({
        title: "OpenAI releases GPT-5.6: creators get faster multimodal workflows",
        categoryName: "AI News",
        locale: "en",
        maxLength: 40,
      }),
    ).toBe("OpenAI releases GPT-5.6");
  });

  it("keeps the audited Claude and Copilot Chinese SERP titles distinct", () => {
    const titles = [
      "恩禾ENHE AI如何帮助用户理解Copilot CLI、BYOK、AI credit与GitHub Models退役？",
      "恩禾ENHE AI如何帮助中文用户理解GitHub Copilot App与桌面AI智能体？",
      "恩禾ENHE AI如何帮助中文用户理解Copilot OTel与智能体治理？",
      "恩禾ENHE AI如何帮助中文用户理解Copilot安全审查、CodeQL与代码安全治理？",
      "恩禾ENHE AI如何帮助中文用户理解Claude Science、AI工作台与可审计产物？",
      "恩禾ENHE AI如何帮助中文用户理解Claude Code与AI代码安全治理？",
      "恩禾ENHE AI如何帮助中文用户理解Claude Reflect和AI技能复盘？",
    ].map((title) =>
      buildAiNewsSerpTitle({
        title,
        categoryName: "AI资讯",
        locale: "zh",
        maxLength: 23,
      }),
    );

    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Copilot CLI"),
        expect.stringContaining("Copilot App"),
        expect.stringContaining("Claude Science"),
        expect.stringContaining("Claude Code"),
      ]),
    );
  });

  it.each([
    [
      "English",
      [
        "## Table of Contents",
        "## Key Takeaways",
        "## Related Tools and Tutorials",
        "## Sources",
        "## FAQ",
        "## Summary",
      ].join("\n\nBody\n\n"),
    ],
    [
      "Chinese",
      [
        "## 文章目录",
        "## 本文核心看点",
        "## 相关工具/教程",
        "## 参考来源",
        "## 常见问题",
        "## 总结",
      ].join("\n\n正文\n\n"),
    ],
  ])("detects %s body headings that replace detail templates", async (_, content) => {
    const aiNews = (await import("@/lib/ai-news")) as Record<string, unknown>;
    const detect = aiNews.detectAiNewsEmbeddedSections as
      | ((value: string) => Record<string, boolean>)
      | undefined;

    expect(detect).toBeTypeOf("function");
    expect(detect?.(content)).toEqual({
      faq: true,
      keyTakeaways: true,
      relatedTools: true,
      relatedTutorials: true,
      sources: true,
      summary: true,
      tableOfContents: true,
    });
  });

  it("detects descriptive Chinese related-content and summary headings", async () => {
    const aiNews = (await import("@/lib/ai-news")) as Record<string, unknown>;
    const detect = aiNews.detectAiNewsEmbeddedSections as
      | ((value: string) => Record<string, boolean>)
      | undefined;

    expect(detect).toBeTypeOf("function");
    expect(
      detect?.(
        "## 有哪些相关工具或教程？\n\n正文\n\n## 总结：下一步该如何行动？\n\n正文",
      ),
    ).toEqual({
      faq: false,
      keyTakeaways: false,
      relatedTools: true,
      relatedTutorials: true,
      sources: false,
      summary: true,
      tableOfContents: false,
    });
  });

  it("does not treat section words in body prose as embedded template headings", async () => {
    const aiNews = (await import("@/lib/ai-news")) as Record<string, unknown>;
    const detect = aiNews.detectAiNewsEmbeddedSections as
      | ((value: string) => Record<string, boolean>)
      | undefined;

    expect(detect).toBeTypeOf("function");
    expect(
      detect?.(
        "This paragraph mentions FAQ, sources, summary, and related tools without adding headings.",
      ),
    ).toEqual({
      faq: false,
      keyTakeaways: false,
      relatedTools: false,
      relatedTutorials: false,
      sources: false,
      summary: false,
      tableOfContents: false,
    });
  });

  it("keeps a 110+ character candidate even when the fallback contains it", () => {
    const candidate =
      `Candidate priority ${"verified workflow context ".repeat(4)}`.trim();
    const fallback = `${candidate} Additional fallback context that should not replace it.`;

    expect(candidate.length).toBeGreaterThanOrEqual(110);
    expect(resolveAiNewsMetaDescription([candidate], fallback)).toBe(candidate);
  });

  it("skips an oversized leading URL and keeps the following prose", () => {
    const url =
      `https://example.com/resource?token=${"opaque".repeat(40)}&mode=review`;
    const prose =
      "This source reference is followed by useful prose about workflow scope, practical limits, and next steps.";
    const description = truncateAiNewsMetaDescription(
      `${url} ${prose}`,
      150,
    );

    expect(url.length).toBeGreaterThan(200);
    expect(description).toBe(prose);
    expect(description.length).toBeLessThanOrEqual(150);
    expect(description).not.toContain(url.slice(0, 24));
  });

  it("uses a stable bounded reference for a single opaque token", () => {
    const token = `opaque${"segment".repeat(30)}`;
    const first = truncateAiNewsMetaDescription(token, 150);
    const second = truncateAiNewsMetaDescription(token, 150);

    expect(first).toBe(second);
    expect(first).toMatch(/^Reference [a-z0-9]{6}$/);
    expect(first.length).toBeLessThanOrEqual(150);
    expect(first).not.toContain(token.slice(0, 24));
  });

  it.each([
    { maxLength: 1, expected: "" },
    { maxLength: 2, expected: "AI" },
    { maxLength: 3, expected: "AI" },
    { maxLength: 4, expected: "AI" },
    { maxLength: 5, expected: "AI" },
  ])(
    "returns a bounded marker for a $maxLength character title budget",
    ({ maxLength, expected }) => {
      const title = buildAiNewsSerpTitle({
        title: "OpaqueSingleTokenThatCannotFit",
        categoryName: "AI News",
        locale: "en",
        maxLength,
      });

      expect(title).toBe(expected);
      expect(title.length).toBeLessThanOrEqual(maxLength);
    },
  );

  it("keeps oversized single-token titles distinct without raw token fragments", () => {
    const tokens = [
      "supercalifragilisticexpialidocious@BetaEnterpriseWorkflow20260726PreviewEdition",
      "xqzvbnmlkjhgfdspoiuytrewqazxcvbnmlkjhgfdsa",
      "mnbvcxzlkjhgfdsapoiuytrewqzxcvbnmasdfghjkl",
    ];
    const titles = tokens.map((token) =>
      buildAiNewsSerpTitle({
        title: token,
        categoryName: "AI News",
        locale: "en",
        maxLength: 24,
      }),
    );

    expect(new Set(titles).size).toBe(tokens.length);
    expect(titles[0]).toBe("Beta Enterprise Workflow");
    for (const [index, title] of titles.entries()) {
      expect(title.length).toBeLessThanOrEqual(24);
      expect(title).not.toBe("AI");
      expect(title).not.toBe("AI News");
      expect(title).not.toMatch(/[@._+#/|,:;\-–—]$/);
      expect(tokens[index].startsWith(title)).toBe(false);
      expect(title).not.toContain(tokens[index].slice(0, 8));
    }
  });

  it.each([
    {
      name: "no candidate",
      candidates: [null, "2026-07-26", "Too short"],
      fallback: `No candidate fallback ${"workflow context ".repeat(7)}Alpha@Boundary${"Segment".repeat(24)} next steps`,
      marker: "No candidate fallback",
      rawPrefix: "Alpha",
    },
    {
      name: "candidate preferred",
      candidates: [
        `Priority candidate ${"workflow context ".repeat(7)}Bravo@Boundary${"Segment".repeat(24)} next steps`,
      ],
      fallback: "A valid fallback summary with enough practical context.",
      marker: "Priority candidate",
      rawPrefix: "Bravo",
    },
    {
      name: "fallback contains candidate",
      candidates: ["Focused candidate context for practical AI workflows."],
      fallback: `Focused candidate context for practical AI workflows. Expanded fallback ${"workflow context ".repeat(4)}Charlie@Boundary${"Segment".repeat(24)} next steps`,
      marker: "Expanded fallback",
      rawPrefix: "Charlie",
    },
    {
      name: "candidate contains fallback",
      candidates: [
        `Reusable fallback context for AI teams. Candidate expansion ${"workflow context ".repeat(5)}Delta@Boundary${"Segment".repeat(24)} next steps`,
      ],
      fallback: "Reusable fallback context for AI teams.",
      marker: "Candidate expansion",
      rawPrefix: "Delta",
    },
    {
      name: "candidate and fallback are concatenated",
      candidates: ["Distinct candidate context for AI teams."],
      fallback: `Separate fallback ${"workflow context ".repeat(5)}Echo@Boundary${"Segment".repeat(24)} next steps`,
      marker: "Separate fallback",
      rawPrefix: "Echo",
    },
  ])(
    "truncates $name descriptions without broken ASCII tokens",
    ({ candidates, fallback, marker, rawPrefix }) => {
      const description = resolveAiNewsMetaDescription(candidates, fallback);

      expect(description.length).toBeLessThanOrEqual(150);
      expect(description).toContain(marker);
      expect(description).not.toContain(rawPrefix);
      expect(description).not.toMatch(/[@._+#/|,:;\-–—]$/);
    },
  );

  it("keeps Chinese description truncation on natural punctuation", () => {
    const description = truncateAiNewsMetaDescription(
      `恩禾 AI 说明这项更新的实际影响、适用范围和后续步骤，${"完整中文说明".repeat(20)}`,
      50,
    );

    expect(description.length).toBeLessThanOrEqual(50);
    expect(description).toContain("实际影响、适用范围和后续步骤");
    expect(description).toContain("完整中文说明");
    expect(description).not.toMatch(/[、，；：]$/);
  });

  it("parses relation ids from comma and newline separated fields", () => {
    expect(parseNewsRelationIds("a, b\nc，a")).toEqual(["a", "b", "c"]);
  });

  it("serializes cached Date strings for structured data", () => {
    expect(toNewsIsoDate("2026-06-18T08:00:00.000Z")).toBe(
      "2026-06-18T08:00:00.000Z",
    );
    expect(toNewsIsoDate(new Date("2026-06-18T08:00:00.000Z"))).toBe(
      "2026-06-18T08:00:00.000Z",
    );
  });
});
