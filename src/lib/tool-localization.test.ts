import { describe, expect, it } from "vitest";
import {
  buildLocalizedToolFaqItems,
  buildLocalizedToolLongContent,
  buildLocalizedToolOfferName,
  buildLocalizedToolSummary,
  buildLocalizedToolTutorialItems,
  resolveLocalizedToolCategoryName,
  resolveLocalizedToolIdentity,
  resolveLocalizedToolTagName,
  shouldIndexEnglishToolPage
} from "@/lib/tool-localization";

describe("tool localization helpers", () => {
  it("prefers english names on english pages and falls back to descriptive slugs", () => {
    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "enhe-copy-cleaner",
          name: "ENHE 文案清洗在线工具",
          englishName: "ENHE Copy Cleaner",
          type: "online"
        },
        "en"
      )
    ).toEqual({
      primaryName: "ENHE Copy Cleaner",
      secondaryName: "ENHE 文案清洗在线工具"
    });

    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "enhe-copy-cleaner",
          name: "ENHE 文案清洗在线工具",
          englishName: null,
          type: "online"
        },
        "en"
      )
    ).toEqual({
      primaryName: "ENHE Copy Cleaner AI Account Service Guidance",
      secondaryName: "ENHE 文案清洗在线工具"
    });
  });

  it("falls back to type labels when english pages only have generated ids", () => {
    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "tool-cmptpgzow0007toe0ld9yuc0w",
          name: "测试",
          englishName: null,
          type: "software"
        },
        "en"
      )
    ).toEqual({
      primaryName: "AI Software App",
      secondaryName: "测试"
    });
  });

  it("maps non-english categories to stable english labels", () => {
    expect(resolveLocalizedToolCategoryName("在线处理", "online", "en")).toBe("Online Processing");
    expect(resolveLocalizedToolCategoryName("自动化软件", "software", "en")).toBe("Automation Software");
    expect(resolveLocalizedToolCategoryName("账号购买服务", "online", "en")).toBe("AI Account Service");
  });

  it("replaces Chinese account-purchase category wording with compliance-safe public labels", () => {
    expect(resolveLocalizedToolCategoryName("账号购买服务", "online", "zh")).toBe("AI账号服务咨询");
    expect(resolveLocalizedToolCategoryName("AI账号购买服务", "online", "zh")).toBe("AI账号服务咨询");
    expect(resolveLocalizedToolCategoryName("账号订阅支持", "online", "zh")).toBe("账号订阅支持");
  });

  it("builds english summaries without surfacing raw chinese descriptions", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "enhe-copy-cleaner",
        name: "ENHE 文案清洗在线工具",
        englishName: null,
        shortDescription: "清理多余空格、换行和特殊符号，适合内容整理。",
        type: "online",
        categoryName: "在线处理"
      },
      "en"
    );

    expect(summary).toContain("AI Account Service Guidance");
    expect(summary).not.toContain("清理多余空格");
  });

  it("does not treat mixed english-and-chinese descriptions as localized english copy", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "ai-ai",
        name: "AI语音生成（随心所欲版）",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription:
          "AI语音生成（随心所欲版）是恩禾 ENHE AI工具站推出的本地离线 AI 语音合成桌面工具。软件基于 Qwen3-TTS 开源项目整理开发，支持文字转语音、声音克隆、声音设计、多角色对话、声音管理、模型微调等功能，适合需要在本地电脑上完成语音生成、音频素材整理与内容生产的用户使用。 AI Voice Generator — Flexible Edition is a local Windows-based AI voice synthesis tool. It supports text-to-speech, voice cloning, voice design, multi-role dialogue generation, and audio file management. It is suitable for content creators, training materials, product demos, voice prototypes, and multilingual audio production workflows.",
        type: "software",
        categoryName: "音频工具"
      },
      "en"
    );

    expect(summary).toContain("AI Voice Generator - Flexible Edition is an AI software app");
    expect(summary).not.toContain("语音生成");
    expect(summary).not.toContain("恩禾");
  });

  it("avoids repeating generic english category labels in generated descriptions", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "ai-ai",
        name: "Raw local name",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription: "draft",
        type: "software",
        categoryName: "AI Software App"
      },
      "en"
    );

    expect(summary).toBe(
      "AI Voice Generator - Flexible Edition is an AI software app. Review pricing, version details, and download access on ENHE AI."
    );
    expect(summary).not.toContain("in ai software app");
  });

  it("builds english detail copy without leaking untranslated chinese paragraphs", () => {
    const content = buildLocalizedToolLongContent(
      {
        slug: "enhe-copy-cleaner",
        name: "ENHE 文案清洗在线工具",
        englishName: null,
        shortDescription: "清理多余空格、换行和特殊符号，适合内容整理。",
        content: "适合整理文案、链接、标题与社交媒体内容，让页面内容更整洁。",
        type: "online",
        categoryName: "在线处理"
      },
      "en"
    );

    expect(content).toContain("support guidance");
    expect(content).not.toContain("full localized tutorials");
    expect(content).not.toContain("适合整理文案");
  });

  it("marks english detail pages without genuine english copy as non-indexable", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "enhe-copy-cleaner",
        name: "ENHE 文案清洗在线工具",
        englishName: null,
        shortDescription: "清理多余空格、换行和特殊符号，适合内容整理。",
        content: "适合整理文案、链接、标题与社交媒体内容，让页面内容更整洁。",
        type: "online"
      })
    ).toBe(false);

    expect(
      shouldIndexEnglishToolPage({
        slug: "enhe-copy-cleaner",
        name: "ENHE 文案清洗在线工具",
        englishName: "ENHE Copy Cleaner",
        shortDescription: "Clean extra spaces, line breaks, and special characters for faster content editing.",
        content: "Use this tool to clean copy, links, headlines, and social snippets before publishing.",
        type: "online"
      })
    ).toBe(true);
  });

  it("does not index generated fallback copy without genuine english source content", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "ai-ai",
        name: "AI语音生成（随心所欲版）",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription: "本地离线 AI 语音合成桌面工具，支持文字转语音、声音克隆、多角色对话和音频管理。",
        content: "适合在本地电脑上完成语音生成、音频素材整理与内容生产，适用于内容创作、培训材料、产品演示和多语种音频工作流。",
        type: "software"
      })
    ).toBe(false);
  });

  it("localizes english detail tags and offer names without exposing raw chinese labels", () => {
    expect(resolveLocalizedToolTagName("效率提升", "en")).toBe("Productivity");
    expect(resolveLocalizedToolTagName("自动化", "en")).toBe("Automation");
    expect(resolveLocalizedToolTagName("Creator Kit", "en")).toBe("Creator Kit");
    expect(resolveLocalizedToolTagName("未映射标签", "en")).toBe("");

    expect(buildLocalizedToolOfferName("基础套餐", "online", "en", 0)).toBe("Service option 1");
    expect(buildLocalizedToolOfferName("Pro access", "software", "en", 1)).toBe("Pro access");
    expect(buildLocalizedToolOfferName("基础套餐", "online", "zh", 0)).toBe("基础套餐");
  });

  it("builds english fallback FAQs and tutorials when source records are not localized yet", () => {
    const tool = {
      slug: "enhe-copy-cleaner",
      name: "ENHE 文案清洗在线工具",
      englishName: null,
      shortDescription: "清理多余空格、换行和特殊符号，适合内容整理。",
      content: "适合整理文案、链接、标题与社交媒体内容。",
      type: "online" as const,
      categoryName: "在线处理"
    };

    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-1",
          question: "怎么使用？",
          answer: "登录后即可查看使用方式。"
        }
      ],
      tool,
      "en"
    );

    expect(faqs).toHaveLength(5);
    expect(faqs[0].question).toBe("What is this AI account service for?");
    expect(faqs[0].answer).not.toContain("登录后");

    const tutorials = buildLocalizedToolTutorialItems(
      [
        {
          id: "tutorial-1",
          title: "使用步骤",
          content: "复制文本后点击处理。",
          notes: null,
          commonErrors: null,
          videoUrl: null
        }
      ],
      tool,
      "en"
    );

    expect(tutorials).toHaveLength(1);
    expect(tutorials[0].title).toBe("Access and usage guide");
    expect(tutorials[0].content).toContain(
      "Check the pricing, delivery notes, and account access details",
    );
    expect(tutorials[0].content).not.toContain("复制文本");
  });
  it("provides five Chinese fallback FAQs for software apps and skill courses", () => {
    const softwareFaqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "ai-video-studio",
        name: "AI Video Studio",
        englishName: "AI Video Studio",
        shortDescription: "本地 AI 视频生成与增强工具。",
        content: "",
        type: "software",
        categoryName: "AI视频工具"
      },
      "zh"
    );
    const courseFaqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "prompt-engineering-course",
        name: "AI 提示词实战课",
        englishName: "Prompt Engineering Course",
        shortDescription: "学习提示词、工作流和 AI 工具实战方法。",
        content: "",
        type: "skill_learning",
        categoryName: "AI技能教程"
      },
      "zh"
    );

    expect(softwareFaqs).toHaveLength(5);
    expect(courseFaqs).toHaveLength(5);
    expect(softwareFaqs.map((item) => item.question).join(" ")).toContain(
      "AI Video Studio",
    );
    expect(courseFaqs.map((item) => item.question).join(" ")).toContain(
      "AI 提示词实战课",
    );
  });
});
