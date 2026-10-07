import { BookOpen, Newspaper, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import type { RedesignLocale } from "@/components/redesign/types";

export const HOME_FEATURES: ReadonlyArray<{
  title: Record<RedesignLocale, string>;
  description: Record<RedesignLocale, string>;
  href: Record<RedesignLocale, string>;
  icon: LucideIcon;
}> = [
  {
    title: { zh: "AI 工具", en: "AI tools" },
    description: { zh: "查找适合创作与工作的工具。", en: "Find tools for creative and everyday work." },
    href: { zh: "/software", en: "/en/software" },
    icon: Sparkles,
  },
  {
    title: { zh: "实用技能", en: "Practical skills" },
    description: { zh: "跟着教程，把新工具真正用起来。", en: "Learn how to put new tools to work." },
    href: { zh: "/ai-skills", en: "/en/ai-skills" },
    icon: BookOpen,
  },
  {
    title: { zh: "AI 资讯", en: "AI news" },
    description: { zh: "了解值得关注的产品与行业动态。", en: "Keep up with products and industry updates." },
    href: { zh: "/ai-news", en: "/en/ai-news" },
    icon: Newspaper,
  },
  {
    title: { zh: "AI 趋势", en: "AI trends" },
    description: { zh: "从已核验的信息中观察需求变化。", en: "Explore demand signals from verified sources." },
    href: { zh: "/ai-trends", en: "/en/ai-trends" },
    icon: TrendingUp,
  },
];

export function EnheRedesignFeatures({ locale }: { locale: RedesignLocale }) {
  return (
    <section
      className="redesign-home-features"
      aria-label={locale === "en" ? "Explore ENHE AI" : "探索 ENHE AI"}
    >
      <div className="redesign-home-features-inner">
        {HOME_FEATURES.map(({ title, description, href, icon: Icon }) => (
          <a className="redesign-home-feature-card" href={href[locale]} key={href[locale]}>
            <Icon aria-hidden="true" size={26} strokeWidth={1.8} />
            <span className="redesign-home-feature-copy">
              <strong>{title[locale]}</strong>
              <span>{description[locale]}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
