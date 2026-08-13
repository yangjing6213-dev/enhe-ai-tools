import type { RedesignLocale } from "@/components/redesign/types";
import type { RedesignProductId } from "@/lib/redesign/home/home-products";

export type RedesignHomeReview = {
  productId: RedesignProductId;
  displayName: Record<RedesignLocale, string>;
  productLabel: Record<RedesignLocale, string>;
  quote: Record<RedesignLocale, string>;
  avatarSrc: string;
  avatarAlt: Record<RedesignLocale, string>;
  stars: 4 | 5;
  exampleLabel: Record<RedesignLocale, string>;
};

export const REVIEW_AUTO_INTERVAL_MS = 5000;
export const REVIEW_MANUAL_RESUME_MS = 6000;
export const REVIEW_INITIAL_INDEX = 2;

export const HOME_REVIEWS = [
  {
    productId: "ultimate-edition",
    displayName: { zh: "林小满", en: "Lin Xiaoman" },
    productLabel: {
      zh: "无所不能版｜AI生成视频应用",
      en: "Ultimate Edition | AI Video Generation Suite",
    },
    quote: {
      zh: "以前看到本地 AI 视频工具就觉得很复杂，按照教程操作了一遍，第一次就生成出了可以使用的视频。最明显的感受是，不需要在多个平台之间来回切换，创作自由了很多。",
      en: "Local AI video tools used to look complicated. I followed the guide and created a usable video on the first try. Not having to move between several platforms made the creative process much freer.",
    },
    avatarSrc: "/redesign/home/avatar-1.svg",
    avatarAlt: { zh: "插画头像：林小满", en: "Illustrated avatar for Lin Xiaoman" },
    stars: 5,
    exampleLabel: { zh: "示例体验反馈", en: "Example experience feedback" },
  },
  {
    productId: "infinitetalk",
    displayName: { zh: "周一然", en: "Zhou Yiran" },
    productLabel: { zh: "InfiniteTalk", en: "InfiniteTalk" },
    quote: {
      zh: "上传一张人物图片和准备好的音频，就能生成数字人口播视频。整个流程比我原来想象得简单，做产品介绍和短视频内容方便了很多。",
      en: "Upload a person image and prepared audio, and a digital-presenter video comes together. The flow was simpler than expected and made product introductions much easier.",
    },
    avatarSrc: "/redesign/home/avatar-2.svg",
    avatarAlt: { zh: "插画头像：周一然", en: "Illustrated avatar for Zhou Yiran" },
    stars: 4,
    exampleLabel: { zh: "示例体验反馈", en: "Example experience feedback" },
  },
  {
    productId: "ai-voice",
    displayName: { zh: "陈知夏", en: "Chen Zhixia" },
    productLabel: { zh: "AI语音生成", en: "AI Voice Generator" },
    quote: {
      zh: "我平时要为短视频制作旁白，以前经常需要反复更换平台。现在可以在本地完成配音和多角色对话，调整起来更直接，也不用担心生成次数突然不够。",
      en: "I make voiceovers for short videos and used to switch platforms repeatedly. Local voiceover and multi-character dialogue are more direct, without worrying about a quota running out.",
    },
    avatarSrc: "/redesign/home/avatar-3.svg",
    avatarAlt: { zh: "插画头像：陈知夏", en: "Illustrated avatar for Chen Zhixia" },
    stars: 5,
    exampleLabel: { zh: "示例体验反馈", en: "Example experience feedback" },
  },
  {
    productId: "lumi-os",
    displayName: { zh: "Mia Carter", en: "Mia Carter" },
    productLabel: { zh: "Lumi-OS", en: "LumiOS" },
    quote: {
      zh: "它不只是一个回答问题的 AI。平时可以陪我聊聊，也能帮助整理待办、记录重要信息。使用一段时间后，更像是电脑里一直在身边的 AI 助手。",
      en: "It is more than an AI that answers questions. It can chat, organize tasks, and keep important notes — more like an assistant that stays beside you.",
    },
    avatarSrc: "/redesign/home/avatar-4.svg",
    avatarAlt: { zh: "插画头像：Mia Carter", en: "Illustrated avatar for Mia Carter" },
    stars: 5,
    exampleLabel: { zh: "示例体验反馈", en: "Example experience feedback" },
  },
  {
    productId: "faceswap-studio",
    displayName: { zh: "Ethan Brooks", en: "Ethan Brooks" },
    productLabel: { zh: "FaceSwap Studio", en: "FaceSwap Studio" },
    quote: {
      zh: "导入素材后就能在本地预览和调整效果，不需要反复上传文件。操作路径比较清楚，对经常制作人物类图片和视频内容的人很实用。",
      en: "After importing material I can preview and adjust locally without repeated uploads. The path is clear and useful for portrait-oriented image and video work.",
    },
    avatarSrc: "/redesign/home/avatar-5.svg",
    avatarAlt: { zh: "插画头像：Ethan Brooks", en: "Illustrated avatar for Ethan Brooks" },
    stars: 4,
    exampleLabel: { zh: "示例体验反馈", en: "Example experience feedback" },
  },
] as const satisfies ReadonlyArray<RedesignHomeReview>;
