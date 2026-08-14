import type { RedesignNavItem } from "./types";

export const REDESIGN_ZH_NAV_ITEMS: ReadonlyArray<RedesignNavItem> = [
  { label: "AI工具", href: "/software" },
  {
    label: "AI Skill",
    href: "/ai-skills",
    children: [
      { label: "AI prompts", href: "/skill-learning/ai-prompt-management" },
      { label: "AI Skill", href: "/ai-skills" },
    ],
  },
  { label: "AI资讯", href: "/ai-news" },
  { label: "AI趋势", href: "/ai-trends" },
  { label: "关于我们", href: "/about" },
  { label: "搜索", href: "/search", kind: "search" },
];

export const REDESIGN_EN_NAV_ITEMS: ReadonlyArray<RedesignNavItem> = [
  { label: "AI tools", href: "/en/software" },
  {
    label: "AI Skill",
    href: "/en/ai-skills",
    children: [
      { label: "AI prompts", href: "/en/skill-learning/ai-prompt-management" },
      { label: "AI Skill", href: "/en/ai-skills" },
    ],
  },
  { label: "AI news", href: "/en/ai-news" },
  { label: "AI trends", href: "/en/ai-trends" },
  { label: "About us", href: "/en/about" },
  { label: "Search", href: "/en/search", kind: "search" },
];
