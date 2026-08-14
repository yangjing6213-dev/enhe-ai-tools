import type { RedesignLocale } from "@/components/redesign/types";

import type { SoftwareLeafCategoryId } from "./software-categories";

export type RedesignSoftwareProductId =
  | "ultimate-edition"
  | "infinitetalk"
  | "ai-voice"
  | "lumi-os"
  | "faceswap-studio"
  | "prompt-management"
  | "codex-switcher"
  | "transfer-link-qr"
  | "chat-screenshot"
  | "ai-side-project-course"
  | "high-frequency-prompts"
  | "seo-geo-audit";

export type SoftwareProductMedia = {
  src: string;
  alt: Record<RedesignLocale, string>;
  width: 1672;
  height: 941;
};

export type SoftwareProduct = {
  id: RedesignSoftwareProductId;
  categoryId: SoftwareLeafCategoryId;
  name: Record<RedesignLocale, string>;
  description: Record<RedesignLocale, string>;
  price: Record<RedesignLocale, string>;
  detailHref: Record<RedesignLocale, string>;
  media: SoftwareProductMedia | null;
};

const SHARED_MEDIA_SIZE = {
  width: 1672,
  height: 941,
} as const;

export const NEW_RELEASE_IDS = [
  "ultimate-edition",
  "infinitetalk",
  "ai-voice",
  "lumi-os",
] as const satisfies ReadonlyArray<RedesignSoftwareProductId>;

export const FEATURED_PRODUCT_IDS = [
  "faceswap-studio",
  "prompt-management",
  "high-frequency-prompts",
] as const satisfies ReadonlyArray<RedesignSoftwareProductId>;

export const SOFTWARE_PRODUCTS = [
  {
    id: "ultimate-edition",
    categoryId: "video",
    name: {
      zh: "无所不能版｜AI生成视频应用",
      en: "Ultimate Edition | AI Video Generation Suite",
    },
    description: {
      zh: "本地完成文生视频、图生视频与视频增强。",
      en: "Complete text-to-video, image-to-video, and video enhancement locally.",
    },
    price: {
      zh: "¥35.00",
      en: "¥35.00",
    },
    detailHref: {
      zh: "/software/ultimate-edition-ai-video-generation-suite",
      en: "/en/software/ultimate-edition-ai-video-generation-suite",
    },
    media: {
      src: "/redesign/home/ultimate-edition.png",
      alt: {
        zh: "无所不能版｜AI生成视频应用公开产品封面",
        en: "Public cover for Ultimate Edition | AI Video Generation Suite",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "infinitetalk",
    categoryId: "video",
    name: {
      zh: "InfiniteTalk",
      en: "InfiniteTalk",
    },
    description: {
      zh: "使用人物图片与音频生成数字人口播视频。",
      en: "Use a person image and audio to create a digital-presenter video.",
    },
    price: {
      zh: "¥9.90",
      en: "¥9.90",
    },
    detailHref: {
      zh: "/software/infinitetalk-ai",
      en: "/en/software/infinitetalk-ai",
    },
    media: {
      src: "/redesign/home/infinitetalk.png",
      alt: {
        zh: "InfiniteTalk 公开产品封面",
        en: "Public cover for InfiniteTalk",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "ai-voice",
    categoryId: "audio",
    name: {
      zh: "AI语音生成",
      en: "Local AI Voice Generator for Voiceover Materials",
    },
    description: {
      zh: "本地生成旁白、配音和多角色对话素材。",
      en: "Create narration, voiceover, and multi-character dialogue locally.",
    },
    price: {
      zh: "¥30.00",
      en: "¥30.00",
    },
    detailHref: {
      zh: "/software/local-ai-voice-generator-for-voiceover-materials",
      en: "/en/software/local-ai-voice-generator-for-voiceover-materials",
    },
    media: {
      src: "/redesign/home/ai-voice.png",
      alt: {
        zh: "AI语音生成公开产品封面",
        en: "Public cover for Local AI Voice Generator",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "lumi-os",
    categoryId: "agent",
    name: {
      zh: "Lumi-OS",
      en: "LumiOS Personal AI Operating Companion",
    },
    description: {
      zh: "陪伴、任务整理、记忆信息和日常工作协助。",
      en: "Companionship with task, memory, and everyday-work assistance.",
    },
    price: {
      zh: "¥50.00",
      en: "¥50.00",
    },
    detailHref: {
      zh: "/software/windows-ai",
      en: "/en/software/windows-ai",
    },
    media: {
      src: "/redesign/home/lumi-os.png",
      alt: {
        zh: "Lumi-OS 公开产品封面",
        en: "Public cover for LumiOS",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "faceswap-studio",
    categoryId: "image",
    name: {
      zh: "FaceSwap Studio",
      en: "FaceSwap Studio Local Portrait Synthesis Lab",
    },
    description: {
      zh: "本地完成人物素材处理、效果预览与创作草稿。",
      en: "Process portrait material, preview results, and shape creative drafts locally.",
    },
    price: {
      zh: "¥30.00",
      en: "¥30.00",
    },
    detailHref: {
      zh: "/software/faceswap-studio-ai",
      en: "/en/software/faceswap-studio-ai",
    },
    media: {
      src: "/redesign/home/faceswap-studio.png",
      alt: {
        zh: "FaceSwap Studio 公开产品封面",
        en: "Public cover for FaceSwap Studio",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "prompt-management",
    categoryId: "efficiency",
    name: {
      zh: "AI提示词管理系统",
      en: "AI Prompt Management System",
    },
    description: {
      zh: "搜索与管理可复用的中英文提示词。",
      en: "Search and manage reusable bilingual prompts.",
    },
    price: {
      zh: "¥1.00",
      en: "¥1.00",
    },
    detailHref: {
      zh: "/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
      en: "/en/software/ai-prompt-management-system-418-bilingual-prompts-for-writing-seo-and-ai-creation",
    },
    media: {
      src: "/redesign/software/prompt-management.png",
      alt: {
        zh: "AI提示词管理系统公开产品封面",
        en: "Public cover for AI Prompt Management System",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "codex-switcher",
    categoryId: "efficiency",
    name: {
      zh: "Codex智能切换助手",
      en: "Codex Provider Switcher",
    },
    description: {
      zh: "一键切换官方与第三方 AI API 连接。",
      en: "Switch official and third-party AI API connections in one place.",
    },
    price: {
      zh: "免费",
      en: "Free",
    },
    detailHref: {
      zh: "/software/codex-api",
      en: "/en/software/codex-api",
    },
    media: null,
  },
  {
    id: "transfer-link-qr",
    categoryId: "efficiency",
    name: {
      zh: "转账链接二维码生成器",
      en: "Transfer Link QR Code Organizer",
    },
    description: {
      zh: "把常用链接和入口整理成二维码素材。",
      en: "Organize frequently used links and entry points as QR materials.",
    },
    price: {
      zh: "免费",
      en: "Free",
    },
    detailHref: {
      zh: "/software/zfb-transfer-link-qr-code-generator",
      en: "/en/software/zfb-transfer-link-qr-code-generator",
    },
    media: null,
  },
  {
    id: "chat-screenshot",
    categoryId: "image",
    name: {
      zh: "聊天截图素材制作",
      en: "No-Code Chat Screenshot Maker",
    },
    description: {
      zh: "快速制作可编辑的手机聊天截图素材。",
      en: "Create editable mobile chat screenshot material quickly.",
    },
    price: {
      zh: "¥9.90",
      en: "¥9.90",
    },
    detailHref: {
      zh: "/software/no-code-chat-screenshot-maker",
      en: "/en/software/no-code-chat-screenshot-maker",
    },
    media: {
      src: "/redesign/software/chat-screenshot.png",
      alt: {
        zh: "聊天截图素材制作公开产品截图",
        en: "Public product image for No-Code Chat Screenshot Maker",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "ai-side-project-course",
    categoryId: "skill",
    name: {
      zh: "AI副业实操课",
      en: "Practical AI Side Project Course",
    },
    description: {
      zh: "通过项目练习建立从工具使用到实际执行的路径。",
      en: "Build a path from tool use to practical execution through projects.",
    },
    price: {
      zh: "免费",
      en: "Free",
    },
    detailHref: {
      zh: "/skill-learning/ai-monetization-side-hustle-course",
      en: "/en/skill-learning/ai-monetization-side-hustle-course",
    },
    media: null,
  },
  {
    id: "high-frequency-prompts",
    categoryId: "skill",
    name: {
      zh: "高频AI提示词",
      en: "High-Frequency AI Prompts for Work, Learning, and Teaching",
    },
    description: {
      zh: "把写作、学习、教学和办公任务整理成提示词。",
      en: "Turn writing, learning, teaching, and office tasks into prompts.",
    },
    price: {
      zh: "免费",
      en: "Free",
    },
    detailHref: {
      zh: "/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
      en: "/en/skill-learning/high-frequency-ai-prompts-for-work-learning-and-teaching",
    },
    media: {
      src: "/redesign/software/chat-screenshot.png",
      alt: {
        zh: "高频AI提示词公开产品截图",
        en: "Public product image for High-Frequency AI Prompts",
      },
      ...SHARED_MEDIA_SIZE,
    },
  },
  {
    id: "seo-geo-audit",
    categoryId: "efficiency",
    name: {
      zh: "独立站 SEO/GEO 智能巡检",
      en: "Independent-site SEO/GEO Audit",
    },
    description: {
      zh: "公开网站 URL，免费巡检 10 页并查看问题。",
      en: "Inspect a public URL across 10 pages and review the observed issues.",
    },
    price: {
      zh: "免费巡检 10 页",
      en: "Free 10-page audit",
    },
    detailHref: {
      zh: "/online-tools/seo-geo-audit",
      en: "/en/online-tools/seo-geo-audit",
    },
    media: null,
  },
] as const satisfies ReadonlyArray<SoftwareProduct>;
