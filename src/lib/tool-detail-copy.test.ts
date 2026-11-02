import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildLocalizedToolMetaDescription,
  buildLocalizedToolPreviewText,
  buildLocalizedToolSummary,
} from "@/lib/tool-localization";

const dictionariesSource = readFileSync(join(process.cwd(), "src/lib/dictionaries.ts"), "utf8");

describe("tool detail copy", () => {
  it("uses product introduction copy without the product-image helper sentence", () => {
    expect(dictionariesSource).toContain('introTitle: "产品介绍"');
    expect(dictionariesSource).not.toContain("图文结合展示工具功能、使用场景和关键界面。");
  });

  it("keeps generated software FAQ copy aligned with product introduction wording", () => {
    const localizationSource = readFileSync(join(process.cwd(), "src/lib/tool-localization.ts"), "utf8");

    expect(localizationSource).toContain("产品介绍和使用教程");
    expect(localizationSource).not.toContain("工具介绍和使用教程");
  });
  it.each(["windows-ai", "faceswap-studio-ai"])(
    "uses the bilingual product summary for %s in the catalog and search metadata",
    (slug) => {
      const summary = "为创作者整理已授权的项目素材。";
      const tool = {
        slug,
        name: "创作工具",
        type: "software" as const,
        shortDescription: `[[zh]]${summary}[[/zh]][[en]]Organize authorized project material for creators.[[/en]]`,
      };
      expect(buildLocalizedToolPreviewText(tool, "zh")).toBe(summary);
      expect(buildLocalizedToolMetaDescription(tool, "zh")).toBe(summary);
    },
  );

  it("uses user-first copy overrides for priority paid detail pages", () => {
    const riskyVideoTool = {
      slug: "ultimate-edition-ai-video-generation-suite",
      name: "无所不能版 | AI生成视频应用",
      englishName: null,
      shortDescription:
        "这个AI应用的主要的特点就是本地部署AI大模型，不受限制，能够随时所欲的生成视频。",
      content: "",
      type: "software" as const,
      categoryName: "AI视频工具",
    };
    const lumiTool = {
      slug: "windows-ai",
      name: "Lumi-OS｜AI情感智能体 | AI伴侣 | 贾维斯",
      englishName: null,
      shortDescription: "把记忆、工具调用和桌面工作台放在一起，陪你推进下一步",
      content: "",
      type: "software" as const,
      categoryName: "AI软件应用",
    };

    const videoDescription = buildLocalizedToolMetaDescription(
      riskyVideoTool,
      "zh",
    );
    const videoSummary = buildLocalizedToolSummary(riskyVideoTool, "zh");
    const lumiDescription = buildLocalizedToolMetaDescription(lumiTool, "zh");

    expect(videoDescription).toContain("创作者");
    expect(videoDescription).toContain("敏感素材");
    expect(videoSummary).toContain("短视频");
    for (const weakClaim of ["主要的特点就是本地部署", "不受限制", "随时所欲", "无所不能"]) {
      expect(videoDescription).not.toContain(weakClaim);
      expect(videoSummary).not.toContain(weakClaim);
    }
    expect(lumiDescription).toContain("真实任务");
    expect(lumiDescription).toContain("隐私边界");
  });
});
