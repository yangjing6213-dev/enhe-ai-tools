import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  tool: {
    findMany: vi.fn()
  },
  newsArticle: {
    findMany: vi.fn()
  }
};

vi.mock("@/lib/db", () => ({
  prisma: prismaMock
}));

describe("sitemap canonical URL contract", () => {
  beforeEach(() => {
    prismaMock.tool.findMany.mockReset();
    prismaMock.newsArticle.findMany.mockReset();
    process.env.APP_URL = "https://www.enhe-tech.com.cn";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.enhe-tech.com.cn";
  });

  it("includes only public canonical routes and excludes private or legacy routes", async () => {
    prismaMock.tool.findMany.mockResolvedValue([
      {
        slug: "ai-ai",
        name: "AI Voice Generator Flexible Edition",
        englishName: "AI Voice Generator Flexible Edition",
        shortDescription: "Generate voice content for production workflows.",
        content: "This AI voice generator helps teams create voice content, review export options, and connect audio work with practical production workflows.",
        type: "software",
        updatedAt: new Date("2026-06-19T01:02:03.000Z")
      },
      {
        slug: "chatgpt-support",
        name: "ChatGPT Account Service",
        englishName: "ChatGPT Account Service",
        shortDescription: "Account usage support and subscription guidance for ChatGPT.",
        content: "This account service page explains access guidance, subscription support, delivery notes, and compliance reminders for ChatGPT users.",
        type: "online",
        updatedAt: new Date("2026-06-18T01:02:03.000Z")
      },
      {
        slug: "prompt-course",
        name: "Prompt Engineering Course",
        englishName: "Prompt Engineering Course",
        shortDescription: "Learn prompt engineering through practical AI workflow lessons.",
        content: "This skill course helps learners build prompt engineering habits, evaluate examples, and apply AI workflows to repeatable work outcomes.",
        type: "skill_learning",
        updatedAt: new Date("2026-06-17T01:02:03.000Z")
      }
    ]);
    prismaMock.newsArticle.findMany.mockResolvedValue([
      {
        slug: "news-legacy",
        title: "AI Agents reshape daily workflows",
        englishTitle: "AI Agents reshape daily workflows",
        englishSummary: "A useful summary for English readers.",
        englishContent: "AI agents are changing how teams connect tools, accounts, tutorials, and workflow automation. ".repeat(3),
        updatedAt: new Date("2026-06-16T01:02:03.000Z")
      }
    ]);

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://www.enhe-tech.com.cn/");
    expect(urls).toContain("https://www.enhe-tech.com.cn/ai-news");
    expect(urls).toContain("https://www.enhe-tech.com.cn/software");
    expect(urls).toContain("https://www.enhe-tech.com.cn/account-services");
    expect(urls).toContain("https://www.enhe-tech.com.cn/skill-learning");
    expect(urls).toContain("https://www.enhe-tech.com.cn/software/ai-voice-generator-flexible-edition");
    expect(urls).toContain("https://www.enhe-tech.com.cn/account-services/chatgpt-support");
    expect(urls).toContain("https://www.enhe-tech.com.cn/skill-learning/prompt-course");
    expect(urls).toContain("https://www.enhe-tech.com.cn/ai-news/ai-agents-reshape-daily-workflows");

    for (const forbidden of ["/admin", "/dashboard", "/user-center", "/login", "/register", "/checkout", "/orders", "/payment", "/api", "/online-tools", "/tools/"]) {
      expect(urls.some((url) => url.includes(forbidden)), forbidden).toBe(false);
    }

    for (const machineReadable of ["/llms.txt", "/pricing.md", "/okf/index.md", "/okf/enhe-ai-overview.md", "/okf/ai-news/index.md"]) {
      expect(urls.some((url) => url.endsWith(machineReadable)), machineReadable).toBe(false);
    }
  });

  it("keeps root sitemap loc and hreflang alternates on the same canonical URL", async () => {
    prismaMock.tool.findMany.mockResolvedValue([]);
    prismaMock.newsArticle.findMany.mockResolvedValue([]);

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
    const root = byUrl.get("https://www.enhe-tech.com.cn/");
    const englishRoot = byUrl.get("https://www.enhe-tech.com.cn/en");

    expect(root).toBeDefined();
    expect(root?.alternates?.languages?.["x-default"]).toBe(root?.url);
    expect(root?.alternates?.languages?.["zh-CN"]).toBe(root?.url);
    expect(englishRoot?.alternates?.languages?.["x-default"]).toBe(root?.url);
    expect(englishRoot?.alternates?.languages?.["zh-CN"]).toBe(root?.url);
  });

  it("only emits hreflang alternates for detail pages that have indexable localized content", async () => {
    prismaMock.tool.findMany.mockResolvedValue([
      {
        slug: "english-ready-app",
        name: "English Ready App",
        englishName: "English Ready App",
        shortDescription: "A complete English summary for productivity workflows.",
        content: "This complete English tool page explains practical AI workflows, use cases, access notes, pricing context, and how teams can evaluate the app before adding it to daily operations.",
        type: "software",
        updatedAt: new Date("2026-06-19T01:02:03.000Z")
      },
      {
        slug: "zh-only-app",
        name: "中文工具",
        englishName: null,
        shortDescription: "中文摘要",
        content: "中文正文内容",
        type: "software",
        updatedAt: new Date("2026-06-19T01:02:03.000Z")
      }
    ]);
    prismaMock.newsArticle.findMany.mockResolvedValue([
      {
        slug: "news-english-ready",
        title: "AI agents reshape workplace automation",
        englishTitle: "AI agents reshape workplace automation",
        englishSummary: "A useful English summary that explains why this AI news matters for ENHE AI readers.",
        englishContent: "AI agents are changing how teams connect tools, accounts, tutorials, and workflow automation. This article explains what changed, why it matters, and how readers can turn the signal into practical next steps for software, courses, and account service planning. ".repeat(2),
        updatedAt: new Date("2026-06-16T01:02:03.000Z")
      },
      {
        slug: "news-zh-only",
        title: "Local AI deployment update",
        englishTitle: "",
        englishSummary: "",
        englishContent: "",
        updatedAt: new Date("2026-06-16T01:02:03.000Z")
      }
    ]);

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    const englishReadyTool = byUrl.get("https://www.enhe-tech.com.cn/software/english-ready-app");
    expect(englishReadyTool?.alternates?.languages?.["en-US"]).toBe("https://www.enhe-tech.com.cn/en/software/english-ready-app");

    const zhOnlyTool = byUrl.get("https://www.enhe-tech.com.cn/software/zh-only-app");
    expect(zhOnlyTool?.alternates?.languages?.["zh-CN"]).toBe("https://www.enhe-tech.com.cn/software/zh-only-app");
    expect(zhOnlyTool?.alternates?.languages?.["en-US"]).toBeUndefined();
    expect(byUrl.has("https://www.enhe-tech.com.cn/en/software/zh-only-app")).toBe(false);

    const englishReadyNews = byUrl.get("https://www.enhe-tech.com.cn/ai-news/ai-agents-reshape-workplace-automation");
    expect(englishReadyNews?.alternates?.languages?.["en-US"]).toBe("https://www.enhe-tech.com.cn/en/ai-news/ai-agents-reshape-workplace-automation");

    const zhOnlyNews = byUrl.get("https://www.enhe-tech.com.cn/ai-news/local-ai-deployment-update");
    expect(zhOnlyNews?.alternates?.languages?.["zh-CN"]).toBe("https://www.enhe-tech.com.cn/ai-news/local-ai-deployment-update");
    expect(zhOnlyNews?.alternates?.languages?.["en-US"]).toBeUndefined();
    expect(byUrl.has("https://www.enhe-tech.com.cn/en/ai-news/local-ai-deployment-update")).toBe(false);
  });

  it("uses updatedAt as lastModified for database-backed tool and AI news URLs", async () => {
    const toolUpdatedAt = new Date("2026-06-19T03:04:05.000Z");
    const newsUpdatedAt = new Date("2026-06-18T03:04:05.000Z");

    prismaMock.tool.findMany.mockResolvedValue([
      {
        slug: "workflow-app",
        name: "Workflow AI App",
        englishName: "Workflow AI App",
        shortDescription: "A complete English summary for workflow automation.",
        content: "This workflow app page explains use cases, workflow fit, access notes, and practical evaluation guidance for teams adopting AI software.",
        type: "software",
        updatedAt: toolUpdatedAt
      }
    ]);
    prismaMock.newsArticle.findMany.mockResolvedValue([
      {
        slug: "agent-news",
        title: "Agent News",
        englishTitle: "Agent workflow launch",
        englishSummary: "A useful summary for English readers.",
        englishContent: "Agent workflows connect daily tools, software, tutorials, and account services into practical automation. ".repeat(3),
        updatedAt: newsUpdatedAt
      }
    ]);

    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    expect(byUrl.get("https://www.enhe-tech.com.cn/software/workflow-app")?.lastModified).toBe(toolUpdatedAt);
    expect(byUrl.get("https://www.enhe-tech.com.cn/ai-news/agent-news")?.lastModified).toBe(newsUpdatedAt);
  });
});
