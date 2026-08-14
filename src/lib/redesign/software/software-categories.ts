import type { RedesignLocale } from "@/components/redesign/types";

export type SoftwareCategoryId =
  | "all"
  | "skill"
  | "video"
  | "image"
  | "audio"
  | "agent"
  | "efficiency";

export type SoftwareLeafCategoryId = Exclude<SoftwareCategoryId, "all">;

export type SoftwareCategory = {
  id: SoftwareCategoryId;
  label: Record<RedesignLocale, string>;
};

export const SOFTWARE_CATEGORIES = [
  {
    id: "all",
    label: {
      zh: "全部产品",
      en: "All products",
    },
  },
  {
    id: "skill",
    label: {
      zh: "AI Skill",
      en: "AI Skill",
    },
  },
  {
    id: "video",
    label: {
      zh: "视频生成",
      en: "Video generation",
    },
  },
  {
    id: "image",
    label: {
      zh: "图片处理",
      en: "Image processing",
    },
  },
  {
    id: "audio",
    label: {
      zh: "语音音频",
      en: "Voice & audio",
    },
  },
  {
    id: "agent",
    label: {
      zh: "AI智能体",
      en: "AI agents",
    },
  },
  {
    id: "efficiency",
    label: {
      zh: "效率工具",
      en: "Productivity",
    },
  },
] as const satisfies ReadonlyArray<SoftwareCategory>;
