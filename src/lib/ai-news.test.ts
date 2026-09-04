import { describe, expect, it } from "vitest";
import {
  buildAiNewsRelatedKeywords,
  mergeAiNewsRelatedItems,
  extractNewsTableOfContents,
  isEnglishNewsArticleIndexable,
  parseNewsRelationIds,
  parseNewsSearchParams,
  renderNewsContentBlocks,
  resolveAiNewsMetaDescription,
  resolveNewsVideo,
  resolveAiNewsCanonicalSlug,
  resolveNewsSlug,
  toNewsIsoDate,
} from "@/lib/ai-news";

describe("AI news helpers", () => {
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
