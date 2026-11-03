import { describe, expect, it } from "vitest";
import {
  buildCanonicalAiNewsPath,
  buildCanonicalToolPath,
  getCanonicalAiNewsSlug,
  getCanonicalToolSlug
} from "@/lib/public-slugs";

describe("public slug helpers", () => {
  it("builds canonical tool slugs and localized paths", () => {
    const tool = {
      slug: "ai-legacy",
      name: "AI语音生成",
      englishName: "AI Voice Generator - Flexible Edition",
      type: "software" as const
    };

    expect(getCanonicalToolSlug(tool)).toBe("ai-voice-generator-flexible-edition");
    expect(buildCanonicalToolPath(tool, "zh")).toBe("/software/ai-voice-generator-flexible-edition");
    expect(buildCanonicalToolPath(tool, "en")).toBe("/en/software/ai-voice-generator-flexible-edition");
  });

  it("uses skill-learning for skill course canonical paths", () => {
    const tool = {
      slug: "ai-course",
      name: "AI prompt course",
      englishName: "AI Prompt Engineering Course",
      type: "skill_learning" as const
    };

    expect(getCanonicalToolSlug(tool)).toBe("ai-prompt-engineering-course");
    expect(buildCanonicalToolPath(tool, "zh")).toBe("/skill-learning/ai-prompt-engineering-course");
    expect(buildCanonicalToolPath(tool, "en")).toBe("/en/skill-learning/ai-prompt-engineering-course");
  });

  it("uses ai-skills for AI Skill canonical paths", () => {
    const tool = {
      slug: "codex-review-skill",
      name: "Codex Code Review Skill",
      englishName: "Codex Code Review Skill",
      type: "ai_skill" as const
    };

    expect(buildCanonicalToolPath(tool, "zh")).toBe("/ai-skills/codex-review-skill");
    expect(buildCanonicalToolPath(tool, "en")).toBe("/en/ai-skills/codex-review-skill");
  });

  it("uses ai-workflows for AI Workflow canonical paths", () => {
    const tool = {
      slug: "meeting-follow-up-flow",
      name: "会议跟进工作流",
      englishName: "Meeting Follow-up Workflow",
      type: "ai_workflow" as const
    };

    expect(buildCanonicalToolPath(tool, "zh")).toBe("/ai-workflows/meeting-follow-up-flow");
    expect(buildCanonicalToolPath(tool, "en")).toBe("/en/ai-workflows/meeting-follow-up-flow");
  });

  it("keeps existing product URLs when product copy titles are updated", () => {
    const renamedProducts = [
      {
        "slug": "faceswap-studio-ai",
        "name": "FaceSwap Studio｜Windows 授权人像与视频合成研究工具",
        "englishName": "FaceSwap Studio | Windows Tool for Authorized Image and Video Compositing",
        "type": "software",
        "expectedPath": "/software/faceswap-studio-ai"
      },
      {
        "slug": "ai-video-studio-ai-ai-video-studio-ai",
        "name": "Windows 本地 AI 视频工作站｜文生视频与图生视频",
        "englishName": "Windows Local AI Video Workspace | Text-to-Video and Image-to-Video",
        "type": "software",
        "expectedPath": "/software/ultimate-edition-ai-video-generation-suite"
      },
      {
        "slug": "zfb",
        "name": "常用链接与二维码整理工具｜制作可核验的入口素材",
        "englishName": "Link and QR Organizer | Create Previewable Entry Materials",
        "type": "software",
        "expectedPath": "/software/zfb-transfer-link-qr-code-generator"
      },
      {
        "slug": "ai-ai",
        "name": "本地 AI 语音生成｜Windows 旁白与多角色音频工作台",
        "englishName": "Local AI Voice Generator | Windows Workspace for Narration and Multi-Character Audio",
        "type": "software",
        "expectedPath": "/software/local-ai-voice-generator-for-voiceover-materials"
      },
      {
        "slug": "windows-ai",
        "name": "Lumi-OS｜Windows 桌面 AI 工作流助手",
        "englishName": "Lumi-OS | AI Workflow Assistant for the Windows Desktop",
        "type": "software",
        "expectedPath": "/software/windows-ai"
      },
      {
        "slug": "codex-api",
        "name": "Codex Provider Switcher｜Windows Codex 连接配置切换工具",
        "englishName": "Codex Provider Switcher | Manage Codex Connection Profiles on Windows",
        "type": "software",
        "expectedPath": "/software/codex-api"
      },
      {
        "slug": "infinitetalk-ai",
        "name": "InfiniteTalk｜图片与音频驱动的数字人口播工具",
        "englishName": "InfiniteTalk | Digital Presenter Videos from Images and Audio",
        "type": "software",
        "expectedPath": "/software/infinitetalk-ai"
      },
      {
        "slug": "ai-prompt",
        "name": "AI 提示词管理｜418 条中英文提示词的搜索与复用",
        "englishName": "AI Prompt Management | Search and Reuse Chinese and English Prompts",
        "type": "software",
        "expectedPath": "/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation"
      },
      {
        "slug": "a-skill",
        "name": "AShareTrace｜A 股研究证据整理 Skill",
        "englishName": "AShareTrace | Evidence Notes for A-Share Research",
        "type": "ai_skill",
        "expectedPath": "/ai-skills/a-skill"
      },
      {
        "slug": "ai-ai-zorvp8",
        "name": "AgentGuardian｜Windows AI 配置风险只读审计",
        "englishName": "AgentGuardian | Read-Only Audit for Windows AI Configurations",
        "type": "software",
        "expectedPath": "/software/ai-ai-zorvp8"
      },
      {
        "slug": "ai-codex",
        "name": "Product Video Studio｜Codex 产品介绍视频制作工作流",
        "englishName": "Product Video Studio | A Codex-Assisted Product Video Workflow",
        "type": "software",
        "expectedPath": "/software/product-video"
      },
      {
        "slug": "codex",
        "name": "Codex Backup｜Windows Codex 项目与工作上下文备份",
        "englishName": "Codex Backup | Back Up Codex Projects and Local Work Context on Windows",
        "type": "software",
        "expectedPath": "/software/codex"
      },
      {
        "slug": "searchscope-seo-geo",
        "name": "SearchScope SEO/GEO 巡检｜公开网页证据与修复清单",
        "englishName": "SearchScope SEO/GEO Audit | Public-Page Evidence and a Repair Checklist",
        "type": "software",
        "expectedPath": "/software/searchscope-seo-geo"
      },
      {
        "slug": "skill",
        "name": "AI 资讯双平台图文 Skill｜一条核实资讯，整理两套发布草稿",
        "englishName": "AI News Content Skill | One Verified Story, Two Platform Drafts",
        "type": "ai_skill",
        "expectedPath": "/ai-skills/skill"
      }
    ] satisfies Array<{ slug: string; name: string; englishName: string; type: "software" | "ai_skill"; expectedPath: string }>;

    for (const product of renamedProducts) {
      expect(getCanonicalToolSlug(product)).toBe(product.expectedPath.split("/").pop());
      expect(buildCanonicalToolPath(product, "zh")).toBe(product.expectedPath);
      expect(buildCanonicalToolPath(product, "en")).toBe(`/en${product.expectedPath}`);
    }
  });

  it("builds canonical AI news slugs and localized paths", () => {
    const article = {
      slug: "ai-news-trend-insights-launch",
      title: "中文标题",
      englishTitle: "OpenAI Agent Workflow Update"
    };

    expect(getCanonicalAiNewsSlug(article)).toBe("openai-agent-workflow-update");
    expect(buildCanonicalAiNewsPath(article, "zh")).toBe("/ai-news/openai-agent-workflow-update");
    expect(buildCanonicalAiNewsPath(article, "en")).toBe("/en/ai-news/openai-agent-workflow-update");
  });

  it("uses account-services for online tool canonical paths", () => {
    const tool = {
      slug: "premium-agent-pass",
      name: "AI account service",
      englishName: "Premium Agent Pass",
      type: "online" as const
    };

    expect(getCanonicalToolSlug(tool)).toBe("premium-agent-pass");
    expect(buildCanonicalToolPath(tool, "zh")).toBe("/account-services/premium-agent-pass");
    expect(buildCanonicalToolPath(tool, "en")).toBe("/en/account-services/premium-agent-pass");
  });
});
