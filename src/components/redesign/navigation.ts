import type { RedesignLocale, RedesignNavItem } from "./types";

export const REDESIGN_NAV_ITEMS = {
  zh: [
    { label: "AI工具", href: "/software" },
    {
      label: "AI Skill",
      href: "/ai-skills",
      children: [
        { label: "AI 提示词", href: "/skill-learning/ai-prompt-management" },
        { label: "AI Skill", href: "/ai-skills" },
      ],
    },
    { label: "AI资讯", href: "/ai-news" },
    { label: "AI趋势", href: "/ai-trends" },
    { label: "关于我们", href: "/about" },
    { label: "搜索", href: "/search", kind: "search" },
  ],
  en: [
    { label: "AI Tools", href: "/en/software" },
    {
      label: "AI Skills",
      href: "/en/ai-skills",
      children: [
        { label: "AI Prompts", href: "/en/skill-learning/ai-prompt-management" },
        { label: "AI Skills", href: "/en/ai-skills" },
      ],
    },
    { label: "AI News", href: "/en/ai-news" },
    { label: "AI Trends", href: "/en/ai-trends" },
    { label: "About", href: "/en/about" },
    { label: "Search", href: "/en/search", kind: "search" },
  ],
} as const satisfies Record<RedesignLocale, ReadonlyArray<RedesignNavItem>>;

export const REDESIGN_ZH_NAV_ITEMS = REDESIGN_NAV_ITEMS.zh;
export const REDESIGN_EN_NAV_ITEMS = REDESIGN_NAV_ITEMS.en;
