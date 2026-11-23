import type { RedesignLocale, RedesignNavItem } from "./types";

export function isExactCurrentPage(pathname: string | undefined, href: string) {
  return pathname === href;
}

export function isCurrentNavigationItem(pathname: string | undefined, item: RedesignNavItem) {
  if (!pathname) return false;
  const matchesPath = (href: string) =>
    pathname === href || (href !== "/" && href !== "/en" && pathname.startsWith(`${href}/`));

  return matchesPath(item.href) || Boolean(item.children?.some((child) => matchesPath(child.href)));
}

export const REDESIGN_NAV_ITEMS = {
  zh: [
    { label: "首页", href: "/" },
    { label: "AI工具", href: "/software" },
    { label: "AI社区", href: "/forum" },
    {
      label: "AI资源",
      href: "/ai-skills",
      children: [
        { label: "提示词库", href: "/skill-learning/ai-prompt-management" },
        { label: "AI技能包", href: "/ai-skills" },
        { label: "项目与资料", href: "/ai-workflows" },
      ],
    },
    { label: "AI资讯", href: "/ai-news" },
    { label: "AI应用场景", href: "/ai-trends" },
    { label: "关于恩禾", href: "/about" },
  ],
  en: [
    { label: "Home", href: "/en" },
    { label: "AI Tools", href: "/en/software" },
    { label: "AI Community", href: "/en/forum" },
    {
      label: "AI Resources",
      href: "/en/ai-skills",
      children: [
        { label: "Prompt Library", href: "/en/skill-learning/ai-prompt-management" },
        { label: "AI Skill Packs", href: "/en/ai-skills" },
        { label: "Projects & Resources", href: "/en/ai-workflows" },
      ],
    },
    { label: "AI News", href: "/en/ai-news" },
    { label: "AI Use Cases", href: "/en/ai-trends" },
    { label: "About ENHE", href: "/en/about" },
  ],
} as const satisfies Record<RedesignLocale, ReadonlyArray<RedesignNavItem>>;

export const REDESIGN_ZH_NAV_ITEMS = REDESIGN_NAV_ITEMS.zh;
export const REDESIGN_EN_NAV_ITEMS = REDESIGN_NAV_ITEMS.en;
