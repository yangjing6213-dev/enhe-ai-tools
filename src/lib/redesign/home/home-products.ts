import type { RedesignLocale } from "@/components/redesign/types";

export type RedesignProductId =
  | "ultimate-edition"
  | "infinitetalk"
  | "ai-voice"
  | "lumi-os"
  | "faceswap-studio";

export type RedesignProduct = {
  id: RedesignProductId;
  name: Record<RedesignLocale, string>;
  description: Record<RedesignLocale, string>;
  alt: Record<RedesignLocale, string>;
  mediaSrc: string;
  width: 1672;
  height: 941;
  detailHref: Record<RedesignLocale, string>;
};

export const HOME_PRODUCTS = [
  {
    id: "ultimate-edition",
    name: {
      zh: "无所不能版｜AI生成视频应用",
      en: "Ultimate Edition | AI Video Generation Suite",
    },
    description: {
      zh: "本地完成文生视频、图生视频与视频增强，不受在线平台限制，打造更自由、更接近“无所不能”的视频创作体验。",
      en: "Complete text-to-video, image-to-video, and video enhancement locally, without online-platform limits, for a freer creative process.",
    },
    alt: {
      zh: "无所不能版｜AI生成视频应用公开产品封面",
      en: "Public cover for Ultimate Edition | AI Video Generation Suite",
    },
    mediaSrc: "/redesign/home/ultimate-edition.png",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/ultimate-edition-ai-video-generation-suite",
      en: "https://www.enhe-tech.com.cn/en/software/ultimate-edition-ai-video-generation-suite",
    },
  },
  {
    id: "infinitetalk",
    name: { zh: "InfiniteTalk", en: "InfiniteTalk" },
    description: {
      zh: "使用人物图片与音频，生成自然流畅的数字人口播视频。",
      en: "Use a person image and audio to create a natural, fluent digital-presenter video.",
    },
    alt: { zh: "InfiniteTalk 公开产品封面", en: "Public cover for InfiniteTalk" },
    mediaSrc: "/redesign/home/infinitetalk.png",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/infinitetalk-ai",
      en: "https://www.enhe-tech.com.cn/en/software/infinitetalk-ai",
    },
  },
  {
    id: "ai-voice",
    name: { zh: "AI语音生成", en: "Local AI Voice Generator" },
    description: {
      zh: "本地生成旁白、配音和多角色对话，不受在线次数与平台流程限制，打造更自由、更接近“无所不能”的声音创作体验。",
      en: "Generate narration, voiceover, and multi-character dialogue locally without online quota or platform-process limits.",
    },
    alt: { zh: "AI语音生成公开产品封面", en: "Public cover for Local AI Voice Generator" },
    mediaSrc: "/redesign/home/ai-voice.png",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/local-ai-voice-generator-for-voiceover-materials",
      en: "https://www.enhe-tech.com.cn/en/software/local-ai-voice-generator-for-voiceover-materials",
    },
  },
  {
    id: "lumi-os",
    name: { zh: "Lumi-OS", en: "LumiOS Personal AI Operating Companion" },
    description: {
      zh: "AI智能体不仅能够作为你的情感陪伴，还能协助整理任务、记忆信息和完成日常工作。",
      en: "An AI agent for companionship that can also organize tasks, remember information, and help with everyday work.",
    },
    alt: { zh: "Lumi-OS 公开产品封面", en: "Public cover for LumiOS Personal AI Operating Companion" },
    mediaSrc: "/redesign/home/lumi-os.png",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/windows-ai",
      en: "https://www.enhe-tech.com.cn/en/software/windows-ai",
    },
  },
  {
    id: "faceswap-studio",
    name: { zh: "FaceSwap Studio", en: "FaceSwap Studio Local Portrait Synthesis Lab" },
    description: {
      zh: "本地完成人物素材合成、效果预览与创作处理，不受在线平台限制，打造更自由、更接近“无所不能”的人像创作体验。",
      en: "Process portrait material, preview results, and shape creative drafts locally without online-platform limits.",
    },
    alt: { zh: "FaceSwap Studio 公开产品封面", en: "Public cover for FaceSwap Studio" },
    mediaSrc: "/redesign/home/faceswap-studio.png",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/faceswap-studio-ai",
      en: "https://www.enhe-tech.com.cn/en/software/faceswap-studio-ai",
    },
  },
] as const satisfies ReadonlyArray<RedesignProduct>;

export const HOME_PRODUCT_COUNT = HOME_PRODUCTS.length;
export const HOME_PRODUCT_DEFAULT_INDEX = 0;
