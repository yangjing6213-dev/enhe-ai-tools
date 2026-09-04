import { describe, expect, it } from "vitest";
import {
  buildLocalizedToolFaqItems,
  buildLocalizedToolLongContent,
  buildLocalizedToolSummary,
  buildLocalizedToolTutorialItems,
  shouldIndexEnglishToolPage,
} from "@/lib/tool-localization";

describe("tool localization bilingual blocks", () => {
  it("reads inline bilingual markers for product summary and detail copy", () => {
    const tool = {
      slug: "lumios-personal-ai-companion",
      name: "LumiOS 个人AI操作伴侣",
      englishName: "LumiOS Personal AI Companion",
      shortDescription:
        "[[zh]]不是又一个聊天窗口，而是能留在你桌面节奏里的个人 AI 操作伴侣。[[/zh]][[en]]Not another chat window, but a personal AI companion that stays in the rhythm of your desktop work.[[/en]]",
      content:
        "[[zh]]# 定义\nLumiOS 把模型、记忆、工具和本地工作台放进同一个入口。\n\n# 适合谁\n适合想把 AI 真正接入日常桌面流程的人。[[/zh]][[en]]# Definition\nLumiOS brings models, memory, tools, and a local workbench into one entry point.\n\n# Who it is for\nBuilt for people who want AI to become part of their everyday desktop flow.[[/en]]",
      type: "software" as const,
      categoryName: "AI电脑软件",
    };

    expect(buildLocalizedToolSummary(tool, "zh")).toContain("个人 AI 操作伴侣");
    expect(buildLocalizedToolSummary(tool, "en")).toContain(
      "personal AI companion",
    );

    const englishContent = buildLocalizedToolLongContent(tool, "en");
    expect(englishContent).toContain("LumiOS brings models, memory, tools");
    expect(englishContent).not.toContain("聊天窗口");
  });

  it("reads inline bilingual markers for FAQs and tutorials", () => {
    const tool = {
      slug: "lumios-personal-ai-companion",
      name: "LumiOS 个人AI操作伴侣",
      englishName: "LumiOS Personal AI Companion",
      shortDescription: "Desktop AI companion",
      content: "Desktop AI companion detail",
      type: "software" as const,
      categoryName: "AI电脑软件",
    };

    const faqs = buildLocalizedToolFaqItems(
      [
        {
          id: "faq-1",
          question:
            "[[zh]]LumiOS 更像什么？[[/zh]][[en]]What does LumiOS feel like in daily use?[[/en]]",
          answer:
            "[[zh]]更像一个会记住你节奏的桌面搭档。[[/zh]][[en]]It feels more like a desktop partner that remembers your rhythm.[[/en]]",
        },
      ],
      tool,
      "en",
    );

    expect(faqs[0].question).toBe("What does LumiOS feel like in daily use?");
    expect(faqs[0].answer).toContain("desktop partner");

    const tutorials = buildLocalizedToolTutorialItems(
      [
        {
          id: "tutorial-1",
          title:
            "[[zh]]第一次启动[[/zh]][[en]]First launch walkthrough[[/en]]",
          content:
            "[[zh]]安装后先完成模型来源配置。[[/zh]][[en]]After install, finish at least one model-source setup before entering the main workspace.[[/en]]",
          notes:
            "[[zh]]建议先选精简模式。[[/zh]][[en]]Start with the simple setup mode if you want the fastest first run.[[/en]]",
          commonErrors:
            "[[zh]]未保存 API Key。[[/zh]][[en]]The API key was entered but not saved before diagnostics ran.[[/en]]",
          videoUrl: null,
        },
      ],
      tool,
      "en",
    );

    expect(tutorials[0].title).toBe("First launch walkthrough");
    expect(tutorials[0].content).toContain("model-source setup");
    expect(tutorials[0].notes).toContain("simple setup mode");
    expect(tutorials[0].commonErrors).toContain("not saved");
  });

  it("isolates legacy unmarked chinese and english product sections", () => {
    const tool = {
      slug: "legacy-mixed-language-voice-tool",
      name: "本地 AI 语音生成工具",
      englishName: "Local AI Voice Generator",
      shortDescription: "本地离线生成语音，适合旁白与音频素材制作。",
      content: [
        "这款工具用于在本地电脑上生成语音素材。",
        "适合内容创作者制作旁白、培训音频和产品演示。",
        "Local AI Voice Generator runs on a local computer and helps creators produce reusable voiceover material without moving the whole workflow into a browser.",
        "Use it for narration drafts, training audio, product demonstrations, and repeatable content-production tasks that need a consistent voice workflow.",
      ].join("\n\n"),
      type: "software" as const,
      categoryName: "语音生成",
    };

    const chineseContent = buildLocalizedToolLongContent(tool, "zh");
    const englishContent = buildLocalizedToolLongContent(tool, "en");

    expect(chineseContent).toContain("本地电脑");
    expect(chineseContent).not.toContain("runs on a local computer");
    expect(englishContent).toContain("runs on a local computer");
    expect(englishContent).not.toContain("本地电脑");
    expect(buildLocalizedToolSummary(tool, "en")).toContain(
      "Local AI Voice Generator",
    );
    expect(shouldIndexEnglishToolPage(tool)).toBe(true);
  });

  it("supplies reviewed english copy for the audited local voice product", () => {
    const tool = {
      slug: "local-ai-voice-generator-for-voiceover-materials",
      name: "AI语音生成（随心所欲版）",
      englishName: "Local AI Voice Generator",
      shortDescription: "本地离线 AI 语音合成桌面工具。",
      content: "支持文字转语音、声音克隆、声音设计、多角色对话和声音管理。",
      type: "software" as const,
      categoryName: "语音生成",
    };

    expect(buildLocalizedToolSummary(tool, "en")).toContain(
      "offline Windows desktop tool",
    );
    expect(buildLocalizedToolLongContent(tool, "en")).toContain(
      "authorized voice cloning",
    );
    expect(buildLocalizedToolLongContent(tool, "en")).not.toContain(
      "支持文字转语音",
    );
    expect(shouldIndexEnglishToolPage(tool)).toBe(true);
  });
});
