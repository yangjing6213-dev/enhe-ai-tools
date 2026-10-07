import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  articleMatchesAiNewsTopic,
  filterAiNewsTopicArticles,
  normalizeAiNewsTopicRecord,
  parseTopicDelimitedRows,
} from "@/lib/ai-news-topic-config";

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AI news topic backend configuration", () => {
  it("normalizes a backend topic record into bilingual frontend copy", () => {
    const topic = normalizeAiNewsTopicRecord({
      slug: "agent-workflows",
      updatedAt: new Date("2026-06-24T08:00:00.000Z"),
      title: "AI 智能体工作流",
      description: "中文描述",
      intro: "中文介绍",
      answer: "中文答案",
      searchQuery: "AI智能体 自动化",
      keywords: ["AI智能体", "Agentic AI"],
      whyItMatters: ["减少重复工作"],
      actionLinks: [{ label: "查看软件", href: "/software" }],
      faqs: [{ question: "适合谁？", answer: "适合需要自动化的人。" }],
      sourceLinks: [{ title: "OpenAI Docs", url: "https://platform.openai.com/docs/" }],
      englishTitle: "AI Agent Workflows",
      englishDescription: "English description",
      englishIntro: "English intro",
      englishAnswer: "English answer",
      englishSearchQuery: "AI agent automation",
      englishKeywords: ["AI Agent", "workflow automation"],
      englishWhyItMatters: ["Reduce repetitive work"],
      englishActionLinks: [{ label: "Explore software", href: "/software" }],
      englishFaqs: [{ question: "Who is it for?", answer: "Teams using automation." }],
    });

    expect(topic.slug).toBe("agent-workflows");
    expect(topic.updatedAt).toBe("2026-06-24T08:00:00.000Z");
    expect(topic.zh.title).toBe("AI 智能体工作流");
    expect(topic.en.title).toBe("AI Agent Workflows");
    expect(topic.zh.actionLinks[0]).toEqual({ label: "查看软件", href: "/software" });
    expect(topic.en.faqs[0]?.question).toBe("Who is it for?");
    expect(topic.sourceLinks[0]?.url).toBe("https://platform.openai.com/docs/");
  });

  it("falls English fields back to Chinese fields when English content is not configured", () => {
    const topic = normalizeAiNewsTopicRecord({
      slug: "local-ai",
      updatedAt: new Date("2026-06-24T08:00:00.000Z"),
      title: "本地部署 AI",
      description: "本地部署描述",
      intro: "本地部署介绍",
      answer: "本地部署答案",
      searchQuery: "本地部署AI",
      keywords: ["本地部署AI"],
      whyItMatters: ["保护隐私"],
      actionLinks: [{ label: "查看教程", href: "/skill-learning" }],
      faqs: [{ question: "为什么要本地部署？", answer: "为了隐私和可控性。" }],
      sourceLinks: [],
      englishTitle: null,
      englishDescription: null,
      englishIntro: null,
      englishAnswer: null,
      englishSearchQuery: null,
      englishKeywords: [],
      englishWhyItMatters: [],
      englishActionLinks: [],
      englishFaqs: [],
    });

    expect(topic.en.title).toBe("本地部署 AI");
    expect(topic.en.searchQuery).toBe("本地部署AI");
    expect(topic.en.keywords).toEqual(["本地部署AI"]);
    expect(topic.en.actionLinks).toEqual([{ label: "查看教程", href: "/skill-learning" }]);
  });

  it("parses admin delimited rows for FAQ, sources, and internal action links", () => {
    expect(parseTopicDelimitedRows("FAQ问题|FAQ答案\n空行无效|", "faq")).toEqual([
      { question: "FAQ问题", answer: "FAQ答案" },
    ]);
    expect(parseTopicDelimitedRows("OpenAI|https://openai.com/\nBad|javascript:alert(1)", "source")).toEqual([
      { title: "OpenAI", url: "https://openai.com/" },
    ]);
    expect(parseTopicDelimitedRows("查看软件|/software\n外部|https://example.com", "action")).toEqual([
      { label: "查看软件", href: "/software" },
      { label: "外部", href: "https://example.com" },
    ]);
  });

  it("matches articles into topics by keyword rules, title, summary, description, and tags", () => {
    const topic = normalizeAiNewsTopicRecord({
      slug: "ai-agent",
      updatedAt: new Date("2026-06-24T08:00:00.000Z"),
      title: "AI 智能体",
      description: "关注 AI Agent",
      intro: "介绍",
      answer: "答案",
      searchQuery: "AI智能体 Agentic AI",
      keywords: ["AI智能体", "AI Agent", "Agentic AI"],
      whyItMatters: [],
      actionLinks: [],
      faqs: [],
      sourceLinks: [],
      englishTitle: "AI Agents",
      englishDescription: null,
      englishIntro: null,
      englishAnswer: null,
      englishSearchQuery: "AI Agent",
      englishKeywords: ["AI Agent"],
      englishWhyItMatters: [],
      englishActionLinks: [],
      englishFaqs: [],
    });

    expect(
      articleMatchesAiNewsTopic(
        {
          title: "OpenAI 发布新的 Agent 工具",
          summary: "可自动完成多步骤任务",
          description: null,
          keywords: "workflow automation",
          englishTitle: null,
          englishSummary: null,
          englishDescription: null,
          englishKeywords: null,
          tagLinks: [{ tag: { name: "AI Agent" } }],
        },
        topic,
        "zh",
      ),
    ).toBe(true);
    expect(
      articleMatchesAiNewsTopic(
        {
          title: "图像压缩技巧",
          summary: "与智能体无关",
          description: null,
          keywords: null,
          englishTitle: null,
          englishSummary: null,
          englishDescription: null,
          englishKeywords: null,
          tagLinks: [{ tag: { name: "设计" } }],
        },
        topic,
        "zh",
      ),
    ).toBe(false);
  });

  it("filters topic articles from candidate news using automatic keyword and tag matching", () => {
    const topic = normalizeAiNewsTopicRecord({
      slug: "local-ai",
      updatedAt: new Date("2026-06-24T08:00:00.000Z"),
      title: "本地部署 AI",
      description: "关注本地部署 AI",
      intro: "介绍",
      answer: "答案",
      searchQuery: "本地部署AI Local AI",
      keywords: ["本地部署AI", "Local AI", "Private AI"],
      whyItMatters: [],
      actionLinks: [],
      faqs: [],
      sourceLinks: [],
      englishTitle: "Local AI",
      englishDescription: null,
      englishIntro: null,
      englishAnswer: null,
      englishSearchQuery: "Local AI Private AI",
      englishKeywords: ["Local AI", "Private AI"],
      englishWhyItMatters: [],
      englishActionLinks: [],
      englishFaqs: [],
    });
    const articles = [
      {
        id: "a1",
        title: "本地部署AI工作站发布",
        summary: "适合私有化推理",
        description: null,
        keywords: null,
        englishTitle: null,
        englishSummary: null,
        englishDescription: null,
        englishKeywords: null,
        tagLinks: [{ tag: { name: "Local AI" } }],
      },
      {
        id: "a2",
        title: "图像压缩工具更新",
        summary: "与本专题无关",
        description: null,
        keywords: null,
        englishTitle: null,
        englishSummary: null,
        englishDescription: null,
        englishKeywords: null,
        tagLinks: [{ tag: { name: "设计工具" } }],
      },
      {
        id: "a3",
        title: "Enterprise private model deployment checklist",
        summary: "A Private AI rollout guide.",
        description: null,
        keywords: "Private AI",
        englishTitle: "Private AI deployment checklist",
        englishSummary: "Local AI and private deployment",
        englishDescription: null,
        englishKeywords: "Local AI, Private AI",
        tagLinks: [],
      },
    ];

    expect(filterAiNewsTopicArticles(articles, topic, "zh", 6).map((article) => article.id)).toEqual([
      "a1",
      "a3",
    ]);
    expect(filterAiNewsTopicArticles(articles, topic, "zh", 1).map((article) => article.id)).toEqual([
      "a1",
    ]);
  });

  it("wires the admin topic management source into schema, actions, navigation, public pages, and sitemap", () => {
    const schema = read("prisma/schema.prisma");
    const actions = read("src/app/admin/actions.ts");
    const adminLayout = read("src/app/admin/layout.tsx");
    const topicPage = read("src/app/ai-news/topics/[slug]/page-shell.tsx");
    const listingPage = read("src/app/ai-news/page-shell.tsx");
    const sitemap = read("src/app/sitemap.ts");

    expect(schema).toContain("model NewsTopic");
    expect(schema).toContain("@@map(\"news_topics\")");
    expect(schema).toContain("englishActionLinks");
    expect(actions).toContain("upsertNewsTopicAction");
    expect(actions).toContain("deleteNewsTopicAction");
    expect(adminLayout).toContain("/admin/ai-news/topics");
    expect(read("src/lib/admin-i18n.ts")).toContain("aiNewsTopics");
    expect(read("src/app/admin/ai-news/topics/page.tsx")).toContain("deleteNewsTopicAction");
    expect(read("src/app/admin/ai-news/topics/[id]/page.tsx")).toContain("upsertNewsTopicAction");
    expect(topicPage).toContain("getPublicAiNewsTopic");
    expect(topicPage).toContain("getPublicAiNewsTopicSlugs");
    expect(listingPage).toContain("getPublicAiNewsTopics");
    expect(sitemap).toContain("getPublicAiNewsTopics");
  });
});
