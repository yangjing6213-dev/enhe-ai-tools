import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { RedesignLocale } from "@/components/redesign/types";
import type {
  SoftwareCategory,
} from "@/lib/redesign/software/software-categories";
import type {
  SoftwareCopy,
} from "@/lib/redesign/software/software-copy";
import type {
  SoftwareProduct,
} from "@/lib/redesign/software/software-products";
import { SOFTWARE_COPY } from "@/lib/redesign/software/software-copy";
import { SOFTWARE_CATEGORIES } from "@/lib/redesign/software/software-categories";
import {
  FEATURED_PRODUCT_IDS,
  NEW_RELEASE_IDS,
  SOFTWARE_PRODUCTS,
} from "@/lib/redesign/software/software-products";

const localized = (zh: string, en: string) => ({ zh, en });

const media = (src: string, zhAlt: string, enAlt: string) => ({
  src,
  alt: localized(zhAlt, enAlt),
  width: 1672 as const,
  height: 941 as const,
});

const EXPECTED_COPY = {
  zh: {
    page: {
      label: "给人生加一个 AI 外挂",
      h1: "AI工具",
      intro:
        "按真实任务找到已公开的 ENHE AI 工具、课程和效率入口，再进入对应详情页了解价格与使用边界。",
    },
    sections: {
      newReleases: {
        heading: "新品推荐",
        description: "公开页面中最近呈现的四个工具入口。",
      },
      featuredProducts: {
        heading: "精选产品",
        description: "三项适合对比浏览的代表性公开产品。",
      },
      allProducts: {
        heading: "全部产品",
        description: "按分类浏览十二个已冻结的公开产品与课程入口。",
      },
    },
    actions: {
      detail: "查看详情",
      loadMore: "加载更多",
      pageTwo: "第 2 页",
    },
  },
  en: {
    page: {
      label: "An AI upgrade for everyday life",
      h1: "AI tools",
      intro:
        "Find public ENHE AI tools, courses, and a free audit by task, then open the matching detail page for price and boundaries.",
    },
    sections: {
      newReleases: {
        heading: "New releases",
        description: "Four entries recently presented in the public catalog.",
      },
      featuredProducts: {
        heading: "Featured products",
        description: "Three public products chosen for side-by-side browsing.",
      },
      allProducts: {
        heading: "All products",
        description:
          "Browse the full set of twelve frozen public products and course entries.",
      },
    },
    actions: {
      detail: "View details",
      loadMore: "Load more",
      pageTwo: "Page 2",
    },
  },
} as const satisfies Record<RedesignLocale, SoftwareCopy>;

const EXPECTED_CATEGORIES = [
  {
    id: "all",
    label: localized("全部产品", "All products"),
  },
  {
    id: "skill",
    label: localized("AI Skill", "AI Skill"),
  },
  {
    id: "video",
    label: localized("视频生成", "Video generation"),
  },
  {
    id: "image",
    label: localized("图片处理", "Image processing"),
  },
  {
    id: "audio",
    label: localized("语音音频", "Voice & audio"),
  },
  {
    id: "agent",
    label: localized("AI智能体", "AI agents"),
  },
  {
    id: "efficiency",
    label: localized("效率工具", "Productivity"),
  },
] as const satisfies ReadonlyArray<SoftwareCategory>;

const EXPECTED_PRODUCTS = [
  {
    id: "ultimate-edition",
    categoryId: "video",
    name: localized("无所不能版｜AI生成视频应用", "Ultimate Edition | AI Video Generation Suite"),
    description: localized(
      "本地完成文生视频、图生视频与视频增强。",
      "Complete text-to-video, image-to-video, and video enhancement locally.",
    ),
    price: localized("¥35.00", "¥35.00"),
    detailHref: localized(
      "/software/ultimate-edition-ai-video-generation-suite",
      "/en/software/ultimate-edition-ai-video-generation-suite",
    ),
    media: media(
      "/redesign/home/ultimate-edition.png",
      "无所不能版｜AI生成视频应用公开产品封面",
      "Public cover for Ultimate Edition | AI Video Generation Suite",
    ),
  },
  {
    id: "infinitetalk",
    categoryId: "video",
    name: localized("InfiniteTalk", "InfiniteTalk"),
    description: localized(
      "使用人物图片与音频生成数字人口播视频。",
      "Use a person image and audio to create a digital-presenter video.",
    ),
    price: localized("¥9.90", "¥9.90"),
    detailHref: localized("/software/infinitetalk-ai", "/en/software/infinitetalk-ai"),
    media: media(
      "/redesign/home/infinitetalk.png",
      "InfiniteTalk 公开产品封面",
      "Public cover for InfiniteTalk",
    ),
  },
  {
    id: "ai-voice",
    categoryId: "audio",
    name: localized("AI语音生成", "Local AI Voice Generator for Voiceover Materials"),
    description: localized(
      "本地生成旁白、配音和多角色对话素材。",
      "Create narration, voiceover, and multi-character dialogue locally.",
    ),
    price: localized("¥30.00", "¥30.00"),
    detailHref: localized(
      "/software/local-ai-voice-generator-for-voiceover-materials",
      "/en/software/local-ai-voice-generator-for-voiceover-materials",
    ),
    media: media(
      "/redesign/home/ai-voice.png",
      "AI语音生成公开产品封面",
      "Public cover for Local AI Voice Generator",
    ),
  },
  {
    id: "lumi-os",
    categoryId: "agent",
    name: localized("Lumi-OS", "LumiOS Personal AI Operating Companion"),
    description: localized(
      "陪伴、任务整理、记忆信息和日常工作协助。",
      "Companionship with task, memory, and everyday-work assistance.",
    ),
    price: localized("¥50.00", "¥50.00"),
    detailHref: localized("/software/windows-ai", "/en/software/windows-ai"),
    media: media(
      "/redesign/home/lumi-os.png",
      "Lumi-OS 公开产品封面",
      "Public cover for LumiOS",
    ),
  },
  {
    id: "faceswap-studio",
    categoryId: "image",
    name: localized("FaceSwap Studio", "FaceSwap Studio Local Portrait Synthesis Lab"),
    description: localized(
      "本地完成人物素材处理、效果预览与创作草稿。",
      "Process portrait material, preview results, and shape creative drafts locally.",
    ),
    price: localized("¥30.00", "¥30.00"),
    detailHref: localized("/software/faceswap-studio-ai", "/en/software/faceswap-studio-ai"),
    media: media(
      "/redesign/home/faceswap-studio.png",
      "FaceSwap Studio 公开产品封面",
      "Public cover for FaceSwap Studio",
    ),
  },
  {
    id: "prompt-management",
    categoryId: "efficiency",
    name: localized("AI提示词管理系统", "AI Prompt Management System"),
    description: localized(
      "搜索与管理可复用的中英文提示词。",
      "Search and manage reusable bilingual prompts.",
    ),
    price: localized("¥1.00", "¥1.00"),
    detailHref: localized(
      "/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
      "/en/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
    ),
    media: media(
      "/redesign/software/prompt-management.png",
      "AI提示词管理系统公开产品封面",
      "Public cover for AI Prompt Management System",
    ),
  },
  {
    id: "codex-switcher",
    categoryId: "efficiency",
    name: localized("Codex智能切换助手", "Codex Provider Switcher"),
    description: localized(
      "一键切换官方与第三方 AI API 连接。",
      "Switch official and third-party AI API connections in one place.",
    ),
    price: localized("免费", "Free"),
    detailHref: localized("/software/codex-api", "/en/software/codex-api"),
    media: null,
  },
  {
    id: "transfer-link-qr",
    categoryId: "efficiency",
    name: localized("转账链接二维码生成器", "Transfer Link QR Code Organizer"),
    description: localized(
      "把常用链接和入口整理成二维码素材。",
      "Organize frequently used links and entry points as QR materials.",
    ),
    price: localized("免费", "Free"),
    detailHref: localized(
      "/software/zfb-transfer-link-qr-code-generator",
      "/en/software/zfb-transfer-link-qr-code-generator",
    ),
    media: null,
  },
  {
    id: "chat-screenshot",
    categoryId: "image",
    name: localized("聊天截图素材制作", "No-Code Chat Screenshot Maker"),
    description: localized(
      "快速制作可编辑的手机聊天截图素材。",
      "Create editable mobile chat screenshot material quickly.",
    ),
    price: localized("¥9.90", "¥9.90"),
    detailHref: localized(
      "/software/no-code-chat-screenshot-maker",
      "/en/software/no-code-chat-screenshot-maker",
    ),
    media: media(
      "/redesign/software/chat-screenshot.png",
      "聊天截图素材制作公开产品截图",
      "Public product image for No-Code Chat Screenshot Maker",
    ),
  },
  {
    id: "ai-side-project-course",
    categoryId: "skill",
    name: localized("AI副业实操课", "Practical AI Side Project Course"),
    description: localized(
      "通过项目练习建立从工具使用到实际执行的路径。",
      "Build a path from tool use to practical execution through projects.",
    ),
    price: localized("免费", "Free"),
    detailHref: localized(
      "/skill-learning/ai-monetization-side-hustle-course",
      "/en/skill-learning/ai-monetization-side-hustle-course",
    ),
    media: null,
  },
  {
    id: "high-frequency-prompts",
    categoryId: "skill",
    name: localized(
      "高频AI提示词",
      "High-Frequency AI Prompts for Work, Learning, and Teaching",
    ),
    description: localized(
      "把写作、学习、教学和办公任务整理成提示词。",
      "Turn writing, learning, teaching, and office tasks into prompts.",
    ),
    price: localized("免费", "Free"),
    detailHref: localized(
      "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
      "/en/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
    ),
    media: media(
      "/redesign/software/chat-screenshot.png",
      "高频AI提示词公开产品截图",
      "Public product image for High-Frequency AI Prompts",
    ),
  },
  {
    id: "seo-geo-audit",
    categoryId: "efficiency",
    name: localized("独立站 SEO/GEO 智能巡检", "Independent-site SEO/GEO Audit"),
    description: localized(
      "公开网站 URL，免费巡检 10 页并查看问题。",
      "Inspect a public URL across 10 pages and review the observed issues.",
    ),
    price: localized("免费巡检 10 页", "Free 10-page audit"),
    detailHref: localized("/online-tools/seo-geo-audit", "/en/online-tools/seo-geo-audit"),
    media: null,
  },
] as const satisfies ReadonlyArray<SoftwareProduct>;

const APPROVED_MEDIA_MANIFEST = [
  {
    source: "docs/enhe-redesign/phase-1a/prototype/assets/product-media/prompt-management.png",
    destination: "public/redesign/software/prompt-management.png",
    sha256: "CFFDF018E7A010F3B4C39A396BCA7068FBD56F3A106E5BB52656CDD3B41B3D8B",
  },
  {
    source: "docs/enhe-redesign/phase-1a/prototype/assets/product-media/chat-screenshot.png",
    destination: "public/redesign/software/chat-screenshot.png",
    sha256: "D9610AA949B140C3FFAD037F0CB5915A0D48FE00CF8F22266CBEABBB487269C7",
  },
] as const;

const hashFile = (relativePath: string) =>
  createHash("sha256")
    .update(readFileSync(join(process.cwd(), relativePath)))
    .digest("hex")
    .toUpperCase();

describe("AI tools candidate data", () => {
  it("keeps the exact bilingual copy, category labels, and section membership", () => {
    expect(SOFTWARE_COPY).toEqual(EXPECTED_COPY);
    expect(SOFTWARE_CATEGORIES).toEqual(EXPECTED_CATEGORIES);
    expect(NEW_RELEASE_IDS).toEqual([
      "ultimate-edition",
      "infinitetalk",
      "ai-voice",
      "lumi-os",
    ]);
    expect(FEATURED_PRODUCT_IDS).toEqual([
      "faceswap-studio",
      "prompt-management",
      "high-frequency-prompts",
    ]);
  });

  it("keeps the exact frozen bilingual product contract for all twelve records", () => {
    expect(SOFTWARE_PRODUCTS).toHaveLength(12);
    expect(new Set(SOFTWARE_PRODUCTS.map((product) => product.id)).size).toBe(12);
    expect(SOFTWARE_PRODUCTS).toEqual(EXPECTED_PRODUCTS);
  });

  it("keeps the exact null-media set and only relative public detail routes", () => {
    expect(
      SOFTWARE_PRODUCTS.filter((product) => product.media === null).map((product) => product.id),
    ).toEqual([
      "codex-switcher",
      "transfer-link-qr",
      "ai-side-project-course",
      "seo-geo-audit",
    ]);
    expect(SOFTWARE_PRODUCTS.every((product) => product.detailHref.zh.startsWith("/"))).toBe(true);
    expect(SOFTWARE_PRODUCTS.every((product) => product.detailHref.en.startsWith("/en/"))).toBe(
      true,
    );
    expect(
      SOFTWARE_PRODUCTS.every(
        (product) =>
          !/https?:|File\.file(?:Url|Path)|delivery/i.test(JSON.stringify(product)),
      ),
    ).toBe(true);
  });

  it("keeps approved copied catalog media pinned to source provenance and manifest sha256", () => {
    for (const asset of APPROVED_MEDIA_MANIFEST) {
      const sourcePath = join(process.cwd(), asset.source);
      const destinationPath = join(process.cwd(), asset.destination);

      expect(existsSync(sourcePath)).toBe(true);
      expect(existsSync(destinationPath)).toBe(true);
      expect(hashFile(asset.source)).toBe(asset.sha256);
      expect(hashFile(asset.destination)).toBe(asset.sha256);
      expect(readFileSync(destinationPath).equals(readFileSync(sourcePath))).toBe(true);
    }
  });
});
