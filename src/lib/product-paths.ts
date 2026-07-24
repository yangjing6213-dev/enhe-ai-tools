import type { Locale } from "@/lib/dictionaries";
import { buildLocalePath } from "@/lib/seo";

export const productPathSlugs = [
  "work-efficiency",
  "media-generation",
  "future-ai",
] as const;

export type ProductPathSlug = (typeof productPathSlugs)[number];

export type ProductPathLocalizedCopy = {
  title: string;
  intro: string;
  metaDescription: string;
  categories: string[];
  emptyTitle: string;
  emptyText: string;
};

export type ProductPathConfig = {
  slug: ProductPathSlug;
  categoryNames: string[];
  zh: ProductPathLocalizedCopy;
  en: ProductPathLocalizedCopy;
};

export const productPathConfigs: Record<ProductPathSlug, ProductPathConfig> = {
  "work-efficiency": {
    slug: "work-efficiency",
    categoryNames: ["AI办公与效率", "AI 智能体"],
    zh: {
      title: "提升工作效率",
      intro:
        "展示分类为AI办公与效率、AI智能体的产品，帮助你找到适合日常办公、自动化流程与任务协作的AI工具。",
      metaDescription:
        "浏览AI办公与效率、AI智能体分类下的产品，比较适用任务、价格、教程、交付方式和使用边界，帮助普通用户更快找到适合办公提效、流程自动化、智能协作与实际工作的AI工具。",
      categories: ["AI办公与效率", "AI智能体"],
      emptyTitle: "暂无提升工作效率产品",
      emptyText: "后台发布对应分类产品后，这里会自动展示。",
    },
    en: {
      title: "Improve work efficiency",
      intro:
        "Browse AI office productivity and AI agent products for daily work, workflow automation, and task collaboration.",
      metaDescription:
        "Browse AI office productivity and AI agent products for work and automation. Compare task fit, pricing, tutorials, delivery, and usage boundaries.",
      categories: ["AI office and productivity", "AI agents"],
      emptyTitle: "No work-efficiency products yet",
      emptyText:
        "Products published under the matching categories will appear here automatically.",
    },
  },
  "media-generation": {
    slug: "media-generation",
    categoryNames: [
      "AI视频生成",
      "AI图片生成",
      "AI语音生成",
      "视频处理",
      "图片处理",
    ],
    zh: {
      title: "生成图片/视频/音频",
      intro:
        "展示分类为AI视频生成、AI图片生成、AI语音生成、视频处理和图片处理的产品，优先找到适合内容创作的工具。",
      metaDescription:
        "浏览AI视频生成、AI图片生成、AI语音生成、视频处理和图片处理分类下的产品，比较输出质量、素材流程、导出格式、价格边界和教程，找到更适合内容创作任务的AI工具。",
      categories: [
        "AI视频生成",
        "AI图片生成",
        "AI语音生成",
        "视频处理",
        "图片处理",
      ],
      emptyTitle: "暂无生成图片/视频/音频产品",
      emptyText: "后台发布对应分类产品后，这里会自动展示。",
    },
    en: {
      title: "Generate image/video/audio",
      intro:
        "Browse AI video, image, and voice generation products plus video and image processing tools for content creation.",
      metaDescription:
        "Browse AI video, image, and voice generation products plus video and image processing tools. Compare output quality, exports, pricing, and tutorials.",
      categories: [
        "AI video generation",
        "AI image generation",
        "AI voice generation",
        "Video processing",
        "Image processing",
      ],
      emptyTitle: "No media-generation products yet",
      emptyText:
        "Products published under the matching categories will appear here automatically.",
    },
  },
  "future-ai": {
    slug: "future-ai",
    categoryNames: [
      "AI 智能体",
      "生活实用AI工具",
      "智能体",
      "账号订购",
      "升级订阅",
      "AI 提示词",
      "AI 副业变现",
    ],
    zh: {
      title: "改变你未来的AI",
      intro:
        "展示AI智能体、生活实用AI工具、智能体、账号订购、升级订阅、AI提示词和AI副业变现产品，帮助你找到更适合长期发展的AI路径。",
      metaDescription:
        "按AI智能体、生活实用AI工具、账号订购、升级订阅、AI提示词和AI副业变现筛选产品，比较学习价值、复用能力、风险边界、价格和教程，找到能长期积累的AI工具/技能路径。",
      categories: [
        "AI 智能体",
        "生活实用AI工具",
        "智能体",
        "账号订购",
        "升级订阅",
        "AI 提示词",
        "AI 副业变现",
      ],
      emptyTitle: "暂无改变你未来的AI产品",
      emptyText: "后台发布对应分类产品后，这里会自动展示。",
    },
    en: {
      title: "AI that changes your future",
      intro:
        "Browse AI agents, practical AI tools for daily life, agent tools, account subscriptions, subscription upgrades, AI prompts, and AI side-income workflows.",
      metaDescription:
        "Browse AI agents, daily AI tools, subscriptions, upgrade plans, prompts, and side-income workflows. Compare learning value, reuse, risk, and pricing.",
      categories: [
        "AI agents",
        "Practical AI tools for daily life",
        "Agents",
        "Account subscriptions",
        "Subscription upgrades",
        "AI prompts",
        "AI side-income workflows",
      ],
      emptyTitle: "No future-AI products yet",
      emptyText:
        "Products published under the matching categories will appear here automatically.",
    },
  },
};

export function getProductPathConfig(slug: string | undefined) {
  if (!slug) return null;
  return productPathConfigs[slug as ProductPathSlug] ?? null;
}

export function buildProductPathHref(slug: ProductPathSlug, locale: Locale) {
  return buildLocalePath(`/product-paths/${slug}`, locale);
}
