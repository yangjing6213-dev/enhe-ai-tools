import { describe, expect, it } from "vitest";
import {
  buildLocalizedToolFaqItems,
  buildLocalizedToolLongContent,
  buildLocalizedToolOfferName,
  buildLocalizedToolSummary,
  buildLocalizedToolTutorialItems,
  resolveLocalizedToolIdentity,
  resolveLocalizedToolTagName,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";

const copyCleanerName = "ENHE \u6587\u6848\u6e05\u6d17\u5728\u7ebf\u5de5\u5177";
const copyCleanerSummary =
  "\u6e05\u7406\u591a\u4f59\u7a7a\u683c\u3001\u6362\u884c\u548c\u7279\u6b8a\u7b26\u53f7\uff0c\u9002\u5408\u5185\u5bb9\u6574\u7406\u3002";
const copyCleanerContent =
  "\u9002\u5408\u6574\u7406\u6587\u6863\u3001\u94fe\u63a5\u3001\u6807\u9898\u4e0e\u793e\u4ea4\u5a92\u4f53\u5185\u5bb9\uff0c\u8ba9\u9875\u9762\u5185\u5bb9\u66f4\u6574\u6d01\u3002";

describe("tool localization helpers", () => {
  it("uses the approved bilingual names for the 14 tools and 6 skill packs", () => {
    const names = [
      ["searchscope-seo-geo", "SearchScope｜网站问题检查与修复建议", "SearchScope | Website Review & Recommendations"],
      ["ai-codex", "Product Video Studio｜产品介绍视频制作", "Product Video Studio | Product Videos with Codex"],
      ["ai-ai", "AI配音｜旁白与多角色对话", "AI Voice Generator | Narration & Dialogue"],
      ["ai-video-studio-ai-ai-video-studio-ai", "AI视频生成｜用文字或图片制作视频", "AI Video Workspace | Text-to-Video & Image-to-Video"],
      ["tool-mq12l5w6", "聊天界面模拟器｜对话演示图制作", "Chat Interface Simulator | Chat Mockups"],
      ["zfb", "链接与二维码整理工具", "Link & QR Organizer"],
      ["ai-prompt", "AI提示词库桌面版", "AI Prompt Library | Desktop Edition"],
      ["ai-skill", "IntentBridge｜需求澄清与确认", "IntentBridge | Clarify & Confirm Requirements"],
      ["codex", "Codex Backup｜项目与工作资料备份", "Codex Backup | Project & Work Context Backup"],
      ["github", "GitHub Backup｜将项目备份到电脑", "GitHub Backup | Local Repository Backup"],
      ["product-video", "Product Video Studio｜产品介绍视频制作", "Product Video Studio | Product Videos with Codex"],
      ["ai-ai-zorvp8", "AgentGuardian｜AI配置风险检查", "AgentGuardian | AI Configuration Risk Review"],
      ["windows-ai", "Lumi-OS｜桌面AI助手", "Lumi-OS | Desktop AI Assistant"],
      ["local-ai-voice-generator-for-voiceover-materials", "AI配音｜旁白与多角色对话", "AI Voice Generator | Narration & Dialogue"],
      ["ultimate-edition-ai-video-generation-suite", "AI视频生成｜用文字或图片制作视频", "AI Video Workspace | Text-to-Video & Image-to-Video"],
      ["no-code-chat-screenshot-maker", "聊天界面模拟器｜对话演示图制作", "Chat Interface Simulator | Chat Mockups"],
      ["faceswap-studio-ai", "FaceSwap Studio｜授权人像与视频合成", "FaceSwap Studio | Image & Video Compositing"],
      ["zfb-transfer-link-qr-code-generator", "链接与二维码整理工具", "Link & QR Organizer"],
      ["codex-api", "Codex Provider Switcher｜连接配置切换", "Codex Provider Switcher | Switch Codex Connections"],
      ["infinitetalk-ai", "InfiniteTalk｜数字人口播视频制作", "InfiniteTalk | Talking Avatar Videos"],
      ["ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation", "AI提示词库桌面版", "AI Prompt Library | Desktop Edition"],
      ["ai-ai-skill", "Bilingual Prose Craft｜中英文写作润色", "Bilingual Prose Craft | Chinese & English Editing"],
      ["ai-skill-ai", "短剧分镜助手｜将剧本整理成镜头提示词", "AI Storyboarding | Shot Prompts from Scripts"],
      ["skill", "AI资讯写作｜双平台图文草稿", "AI News Content | Drafts for Two Platforms"],
      ["intentbridge", "IntentBridge｜需求澄清与确认", "IntentBridge | Clarify & Confirm Requirements"],
      ["a-skill", "AShareTrace｜A股研究资料整理", "AShareTrace | A-Share Research Notes"],
      ["seo-geo-skill", "SEO + GEO Website Audit｜公开网页检查", "SEO + GEO Website Audit | Public Page Review"],
    ] as const;

    for (const [slug, chineseName, englishName] of names) {
      expect(
        resolveLocalizedToolIdentity(
          { slug, name: "Old source name", englishName: "Old English name", type: "software" },
          "zh",
        ),
      ).toEqual({ primaryName: chineseName, secondaryName: englishName });
      expect(
        resolveLocalizedToolIdentity(
          { slug, name: "Old source name", englishName: "Old English name", type: "software" },
          "en",
        ),
      ).toEqual({ primaryName: englishName, secondaryName: chineseName });
    }
  });

  it("prefers english names on english pages and falls back to descriptive slugs", () => {
    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "enhe-copy-cleaner",
          name: copyCleanerName,
          englishName: "ENHE Copy Cleaner",
          type: "online",
        },
        "en",
      ),
    ).toEqual({
      primaryName: "ENHE Copy Cleaner",
      secondaryName: copyCleanerName,
    });

    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "enhe-copy-cleaner",
          name: copyCleanerName,
          englishName: null,
          type: "online",
        },
        "en",
      ),
    ).toEqual({
      primaryName: "ENHE Copy Cleaner",
      secondaryName: copyCleanerName,
    });
  });

  it("falls back to type labels when english pages only have generated ids", () => {
    expect(
      resolveLocalizedToolIdentity(
        {
          slug: "tool-cmptpgzow0007toe0ld9yuc0w",
          name: "\u6d4b\u8bd5",
          englishName: null,
          type: "software",
        },
        "en",
      ),
    ).toEqual({
      primaryName: "AI Software App",
      secondaryName: "\u6d4b\u8bd5",
    });
  });

  it("does not expose Chinese-only summaries as English copy", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: null,
        shortDescription: copyCleanerSummary,
        type: "online",
        categoryName: "Online Processing",
      },
      "en",
    );

    expect(summary).toContain("AI account service");
    expect(summary).not.toContain(copyCleanerSummary);
  });

  it("does not expose mixed Chinese source descriptions as English copy", () => {
    const mixedSummary = `${copyCleanerSummary} ENHE Copy Cleaner helps prepare copy before publishing.`;
    const summary = buildLocalizedToolSummary(
      {
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: "ENHE Copy Cleaner",
        shortDescription: mixedSummary,
        type: "software",
        categoryName: "AI Software App",
      },
      "en",
    );

    expect(summary).toContain("Review pricing, version details");
    expect(summary).not.toContain(copyCleanerSummary);
  });

  it("uses fallback English descriptions for display but not for indexing", () => {
    const summary = buildLocalizedToolSummary(
      {
        slug: "ai-ai",
        name: "Raw local name",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription: "draft",
        type: "software",
        categoryName: "AI Software App",
      },
      "en",
    );

    expect(summary).toContain(
      "AI Voice Generator | Narration & Dialogue is an AI software app",
    );
  });

  it("does not expose Chinese-only detail copy on English pages", () => {
    const content = buildLocalizedToolLongContent(
      {
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: null,
        shortDescription: copyCleanerSummary,
        content: copyCleanerContent,
        type: "online",
        categoryName: "Online Processing",
      },
      "en",
    );

    expect(content).toContain("support guidance");
    expect(content).not.toContain(copyCleanerContent);
  });

  it("selects English summary and content blocks for English tool pages", () => {
    const shortDescription =
      "[[zh]]\u4e2d\u6587\u5de5\u5177\u6458\u8981\u3002[[/zh]][[en]]Create polished images faster with a focused AI workflow.[[/en]]";
    const content =
      "[[zh]]\u4e2d\u6587\u5de5\u5177\u8be6\u60c5\u3002[[/zh]][[en]]Use the guided workspace to create, review, refine, and export production-ready images for everyday creative projects.[[/en]]";
    const tool = {
      slug: "bilingual-image-studio",
      name: "\u53cc\u8bed AI \u56fe\u7247\u5de5\u5177",
      englishName: "Bilingual AI Image Studio",
      shortDescription,
      content,
      type: "software" as const,
    };

    expect(buildLocalizedToolSummary(tool, "en")).toBe(
      "Create polished images faster with a focused AI workflow.",
    );
    expect(buildLocalizedToolLongContent(tool, "en")).toBe(
      "Use the guided workspace to create, review, refine, and export production-ready images for everyday creative projects.",
    );
    expect(buildLocalizedToolSummary(tool, "zh")).toBe("\u4e2d\u6587\u5de5\u5177\u6458\u8981\u3002");
    expect(buildLocalizedToolLongContent(tool, "zh")).toBe("\u4e2d\u6587\u5de5\u5177\u8be6\u60c5\u3002");
    expect(shouldIndexEnglishToolPage(tool)).toBe(true);
  });

  it("marks english detail pages without genuine english source copy as non-indexable", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: null,
        shortDescription: copyCleanerSummary,
        content: copyCleanerContent,
        type: "online",
      }),
    ).toBe(false);

    expect(
      shouldIndexEnglishToolPage({
        slug: "enhe-copy-cleaner",
        name: copyCleanerName,
        englishName: "ENHE Copy Cleaner",
        shortDescription:
          "Clean extra spaces, line breaks, and special characters for faster content editing.",
        content:
          "Use this tool to clean copy, links, headlines, and social snippets before publishing.",
        type: "online",
      }),
    ).toBe(true);
  });

  it("keeps SearchScope non-indexable while its English copy is being reviewed", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "searchscope-seo-geo",
        name: "SearchScope SEO/GEO",
        englishName: "SearchScope SEO/GEO",
        shortDescription:
          "Review basic SEO and GEO signals on publicly accessible websites.",
        content:
          "Inspect public page titles, content structure, multilingual relations, structured data, and crawler rules. Review evidence, priorities, and suggested next steps before applying changes.",
        type: "software",
      }),
    ).toBe(false);
  });

  it("does not index English details when only generated English copy would exist", () => {
    expect(
      shouldIndexEnglishToolPage({
        slug: "ai-ai",
        name: "\u0041\u0049\u8bed\u97f3\u751f\u6210",
        englishName: "AI Voice Generator - Flexible Edition",
        shortDescription:
          "\u672c\u5730\u79bb\u7ebf AI \u8bed\u97f3\u5408\u6210\u684c\u9762\u5de5\u5177\u3002",
        content:
          "\u9002\u5408\u5728\u672c\u5730\u7535\u8111\u4e0a\u5b8c\u6210\u8bed\u97f3\u751f\u6210\u548c\u97f3\u9891\u7d20\u6750\u6574\u7406\u3002",
        type: "software",
      }),
    ).toBe(false);
  });

  it("localizes english detail tags and offer names without exposing risky account labels", () => {
    expect(resolveLocalizedToolTagName("Creator Kit", "en")).toBe(
      "Creator Kit",
    );
    expect(
      buildLocalizedToolOfferName("\u57fa\u7840\u5957\u9910", "online", "en", 0),
    ).toBe("Service option 1");
    expect(buildLocalizedToolOfferName("Pro access", "software", "en", 1)).toBe(
      "Pro access",
    );
    expect(
      buildLocalizedToolOfferName("\u57fa\u7840\u5957\u9910", "online", "zh", 0),
    ).toBe("\u57fa\u7840\u5957\u9910");
  });

  it("switches English page FAQs and tutorials to English content", () => {
    const tool = {
      slug: "enhe-copy-cleaner",
      name: copyCleanerName,
      englishName: null,
      shortDescription: copyCleanerSummary,
      content: copyCleanerContent,
      type: "online" as const,
      categoryName: "Online Processing",
    };

    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-1",
          question:
            "[[zh]]\u600e\u4e48\u4f7f\u7528\uff1f[[/zh]][[en]]How do I use it?[[/en]]",
          answer:
            "[[zh]]\u767b\u5f55\u540e\u5373\u53ef\u67e5\u770b\u4f7f\u7528\u65b9\u5f0f\u3002[[/zh]][[en]]Sign in to view access notes and usage steps.[[/en]]",
        },
      ],
      tool,
      "en",
    );

    expect(faqs).toHaveLength(5);
    expect(faqs[0].question).toBe("How do I use it?");
    expect(faqs[0].answer).toContain("Sign in to view access notes");

    const tutorials = buildLocalizedToolTutorialItems(
      [
        {
          id: "tutorial-1",
          title:
            "[[zh]]\u4f7f\u7528\u6b65\u9aa4[[/zh]][[en]]Access guide[[/en]]",
          content:
            "[[zh]]\u590d\u5236\u6587\u672c\u540e\u70b9\u51fb\u5904\u7406\u3002[[/zh]][[en]]Copy text, review the settings, and click the process button.[[/en]]",
          notes: null,
          commonErrors: null,
          videoUrl: null,
        },
      ],
      tool,
      "en",
    );

    expect(tutorials).toHaveLength(1);
    expect(tutorials[0].title).toBe("Access guide");
    expect(tutorials[0].content).toContain("Copy text");
  });

  it("uses English FAQ and tutorial fallbacks when records only have Chinese copy", () => {
    const tool = {
      slug: "enhe-copy-cleaner",
      name: copyCleanerName,
      englishName: null,
      shortDescription: copyCleanerSummary,
      content: copyCleanerContent,
      type: "online" as const,
      categoryName: "Online Processing",
    };

    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-1",
          question: "\u600e\u4e48\u4f7f\u7528\uff1f",
          answer:
            "\u767b\u5f55\u540e\u5373\u53ef\u67e5\u770b\u4f7f\u7528\u65b9\u5f0f\u3002",
        },
      ],
      tool,
      "en",
    );
    const tutorials = buildLocalizedToolTutorialItems(
      [
        {
          id: "tutorial-1",
          title: "\u4f7f\u7528\u6b65\u9aa4",
          content:
            "\u590d\u5236\u6587\u672c\u540e\u70b9\u51fb\u5904\u7406\u3002",
          notes: null,
          commonErrors: null,
          videoUrl: null,
        },
      ],
      tool,
      "en",
    );

    expect(faqs[0].question).toBe("What is this AI account service for?");
    expect(faqs[0].answer).toContain("AI account service");
    expect(faqs[0].answer).toContain("access support");
    expect(tutorials[0].title).toBe("Access and usage guide");
    expect(tutorials[0].content).toContain("Review pricing, delivery notes");
  });

  it("provides five Chinese fallback FAQs for software apps and skill courses", () => {
    const softwareFaqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "ai-video-studio",
        name: "AI Video Studio",
        englishName: "AI Video Studio",
        shortDescription: "\u672c\u5730 AI \u89c6\u9891\u751f\u6210\u5de5\u5177\u3002",
        content: "",
        type: "software",
        categoryName: "AI \u89c6\u9891\u5de5\u5177",
      },
      "zh",
    );
    const courseFaqs = buildLocalizedToolFaqItems(
      [],
      {
        slug: "prompt-engineering-course",
        name: "AI \u63d0\u793a\u8bcd\u5b9e\u6218\u8bfe",
        englishName: "Prompt Engineering Course",
        shortDescription:
          "\u5b66\u4e60\u63d0\u793a\u8bcd\u548c AI \u5de5\u5177\u5b9e\u6218\u65b9\u6cd5\u3002",
        content: "",
        type: "skill_learning",
        categoryName: "AI \u6280\u80fd\u6559\u7a0b",
      },
      "zh",
    );

    expect(softwareFaqs).toHaveLength(5);
    expect(courseFaqs).toHaveLength(5);
    expect(softwareFaqs.map((item) => item.question).join(" ")).toContain(
      "AI Video Studio",
    );
    expect(courseFaqs.map((item) => item.question).join(" ")).toContain(
      "AI \u63d0\u793a\u8bcd\u5b9e\u6218\u8bfe",
    );
  });

  it("does not describe AI Skills as account services in generated Chinese or English FAQs", () => {
    const tool = {
      slug: "intentbridge",
      name: "IntentBridge",
      englishName: "IntentBridge | Clarify and Confirm Requirements with AI",
      shortDescription: "A reusable AI Skill for clarifying requirements.",
      content: "",
      type: "ai_skill" as const,
      categoryName: "AI Skills",
    };

    const chineseFaqs = buildLocalizedToolFaqItems([], tool, "zh");
    const englishFaqs = buildLocalizedToolFaqItems([], tool, "en");

    expect(chineseFaqs).toHaveLength(5);
    expect(englishFaqs).toHaveLength(5);
    expect(chineseFaqs.map((item) => item.question).join(" ")).not.toContain(
      "AI\u8d26\u53f7\u670d\u52a1",
    );
    expect(chineseFaqs.map((item) => item.answer).join(" ")).not.toContain(
      "AI\u5de5\u5177\u8ba2\u9605",
    );
    expect(englishFaqs.map((item) => item.question).join(" ")).not.toContain(
      "AI account service",
    );
    expect(englishFaqs.map((item) => item.answer).join(" ")).not.toContain(
      "AI account service",
    );
  });

  it("replaces persisted account-service FAQs on AI Skill pages with Skill-specific guidance", () => {
    const tool = {
      slug: "ai-ai-skill",
      name: "AI生成文章、报告、文案润色，去AI味Skill",
      englishName: "Bilingual Prose Craft | Chinese & English Editing",
      shortDescription: "A writing Skill for editing Chinese and English drafts.",
      content: "",
      type: "ai_skill" as const,
      categoryName: "AI Skills",
    };
    const publishedFaqs = [
      {
        id: "published-account-faq",
        question: "这项AI账号服务主要提供什么支持？",
        answer:
          "该服务主要提供AI工具订阅与账号使用支持、访问建议、交付说明和售后边界说明。",
      },
      {
        id: "published-access-faq",
        question: "购买软件后如何获取下载内容？",
        answer: "购买后可在用户中心查看对应软件的下载链接、版本信息和使用说明。",
      },
    ];

    const chineseFaqs = buildLocalizedToolFaqItems(publishedFaqs, tool, "zh");
    const englishFaqs = buildLocalizedToolFaqItems(publishedFaqs, tool, "en");

    expect(chineseFaqs.map((item) => item.question).join(" ")).not.toContain(
      "AI账号服务",
    );
    expect(chineseFaqs.map((item) => item.answer).join(" ")).not.toContain(
      "AI工具订阅",
    );
    expect(chineseFaqs.map((item) => item.question).join(" ")).toContain(
      "如何安装与使用",
    );
    expect(englishFaqs.map((item) => item.question).join(" ")).not.toContain(
      "AI account service",
    );
    expect(englishFaqs.map((item) => item.question).join(" ")).toContain(
      "How do I install and use this skill pack?",
    );
  });

  it("keeps Codex Provider Switcher copy clear that it changes local settings without manual editing", () => {
    const tool = {
      slug: "codex-api",
      name: "Codex Provider Switcher",
      englishName: "Codex Provider Switcher | Switch Codex Connections",
      shortDescription: "无需修改任何配置文件即可切换。",
      content: "切换连接不会修改配置文件。",
      type: "software" as const,
    };

    const zhSummary = buildLocalizedToolSummary(tool, "zh");
    const zhContent = buildLocalizedToolLongContent(tool, "zh");
    const enSummary = buildLocalizedToolSummary(tool, "en");
    const enContent = buildLocalizedToolLongContent(tool, "en");
    const persistedFaqs = [{
      id: "old-provider-faq",
      question: "Does switching modify configuration files?",
      answer: "No configuration files or local settings are changed.",
    }];
    const zhFaqs = buildLocalizedToolFaqItems(persistedFaqs, tool, "zh");
    const enFaqs = buildLocalizedToolFaqItems(persistedFaqs, tool, "en");

    expect(zhSummary).toContain("无需手动编辑配置文件");
    expect(zhSummary).toContain("会修改本机连接设置");
    expect(zhContent).toContain("切换前请备份本机设置");
    expect(zhContent).toContain("当前版本支持的连接方式");
    expect(enSummary).toContain("No manual configuration-file editing is required");
    expect(enSummary).toContain("switching changes local connection settings");
    expect(enContent).toContain("Back up local settings before switching");
    expect(enContent).toContain("connection methods supported by your current version");
    expect(zhFaqs.map((item) => `${item.question} ${item.answer}`).join(" ")).toContain("会修改本机连接设置");
    expect(enFaqs.map((item) => `${item.question} ${item.answer}`).join(" ")).toContain("changes local connection settings");
    expect(enFaqs.map((item) => item.answer).join(" ")).not.toContain("No configuration files or local settings are changed");
  });
});
