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
    name: { zh: "AI视频生成｜用文字或图片制作视频", en: "AI Video Workspace | Text-to-Video & Image-to-Video" },
    description: { zh: "在符合显卡和磁盘要求的 Windows 电脑上用文字或图片生成视频。效果取决于设备、模型和设置。", en: "Create video from text or images on a compatible Windows PC. Results depend on the hardware, model, and settings." },
    alt: { zh: "AI视频生成｜用文字或图片制作视频", en: "AI Video Workspace | Text-to-Video & Image-to-Video" },
    mediaSrc: "/images/naming-20261121/ai-video-studio-ai-ai-video-studio-ai.webp",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/ultimate-edition-ai-video-generation-suite",
      en: "https://www.enhe-tech.com.cn/en/software/ultimate-edition-ai-video-generation-suite",
    },
  },
  {
    id: "infinitetalk",
    name: { zh: "InfiniteTalk｜数字人口播视频制作", en: "InfiniteTalk | Talking Avatar Videos" },
    description: { zh: "使用已授权的图片与音频制作数字人口播视频。", en: "Create talking avatar videos from images and audio you have permission to use." },
    alt: { zh: "InfiniteTalk｜数字人口播视频制作", en: "InfiniteTalk | Talking Avatar Videos" },
    mediaSrc: "/images/naming-20261121/infinitetalk-ai.webp",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/infinitetalk-ai",
      en: "https://www.enhe-tech.com.cn/en/software/infinitetalk-ai",
    },
  },
  {
    id: "ai-voice",
    name: { zh: "AI配音｜旁白与多角色对话", en: "AI Voice Generator | Narration & Dialogue" },
    description: { zh: "在 Windows 电脑上生成旁白、配音和多角色对话。", en: "Create narration, voiceovers, and multi-character dialogue on a Windows PC." },
    alt: { zh: "AI配音｜旁白与多角色对话", en: "AI Voice Generator | Narration & Dialogue" },
    mediaSrc: "/images/naming-20261121/ai-ai.webp",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/local-ai-voice-generator-for-voiceover-materials",
      en: "https://www.enhe-tech.com.cn/en/software/local-ai-voice-generator-for-voiceover-materials",
    },
  },
  {
    id: "lumi-os",
    name: { zh: "Lumi-OS｜桌面AI助手", en: "Lumi-OS | Desktop AI Assistant" },
    description: { zh: "在 Windows 桌面上整理任务、记录信息，并跟进日常工作。", en: "Organize tasks, keep notes, and follow up on everyday work from your Windows desktop." },
    alt: { zh: "Lumi-OS｜桌面AI助手", en: "Lumi-OS | Desktop AI Assistant" },
    mediaSrc: "/images/naming-20261121/windows-ai.webp",
    width: 1672,
    height: 941,
    detailHref: {
      zh: "https://www.enhe-tech.com.cn/software/windows-ai",
      en: "https://www.enhe-tech.com.cn/en/software/windows-ai",
    },
  },
  {
    id: "faceswap-studio",
    name: { zh: "FaceSwap Studio｜授权人像与视频合成", en: "FaceSwap Studio | Image & Video Compositing" },
    description: { zh: "在 Windows 上使用已授权的人像素材，测试图片与视频合成效果。", en: "Test image and video compositing on Windows using portrait material you have permission to use." },
    alt: { zh: "FaceSwap Studio｜授权人像与视频合成", en: "FaceSwap Studio | Image & Video Compositing" },
    mediaSrc: "/images/naming-20261121/faceswap-studio-ai.webp",
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
