"use client";

import type { RedesignLocale } from "@/components/redesign/types";
import FolderFloat from "@/components/FolderFloat";
import { EnheIconfontIcon, type EnheIconfontName } from "@/components/redesign/enhe-iconfont-icon";

export const HOME_FEATURES: ReadonlyArray<{
  title: Record<RedesignLocale, string>;
  description: Record<RedesignLocale, string>;
  href: Record<RedesignLocale, string>;
  icon: EnheIconfontName;
}> = [
  {
    title: { zh: "AI 工具", en: "AI tools" },
    description: { zh: "查找适合创作与工作的工具。", en: "Find tools for creative and everyday work." },
    href: { zh: "/software", en: "/en/software" },
    icon: "code",
  },
  {
    title: { zh: "实用技能", en: "Practical skills" },
    description: { zh: "跟着教程，把新工具真正用起来。", en: "Learn how to put new tools to work." },
    href: { zh: "/ai-skills", en: "/en/ai-skills" },
    icon: "training",
  },
  {
    title: { zh: "AI 资讯", en: "AI news" },
    description: { zh: "了解值得关注的产品与行业动态。", en: "Keep up with products and industry updates." },
    href: { zh: "/ai-news", en: "/en/ai-news" },
    icon: "file-common",
  },
  {
    title: { zh: "AI 趋势", en: "AI trends" },
    description: { zh: "从已核验的信息中观察需求变化。", en: "Explore demand signals from verified sources." },
    href: { zh: "/ai-trends", en: "/en/ai-trends" },
    icon: "data-view",
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
          <div className="redesign-home-feature-folder" key={href[locale]}>
            <FolderFloat
              label={title[locale]}
              sublabel={locale === "zh" ? "点击或悬停探索" : "Open to explore"}
              items={[{ label: locale === "zh" ? `查看${title[locale]}` : `Explore ${title[locale]}`, value: href[locale] }]}
              trigger="hover"
              closeOnSelect
              physics
              drift={0.5}
              folderColor="#3f3f46"
              frontColor="#52525b"
              paperColor="#f5f5f5"
              itemColor="#f5f5f5"
              itemTextColor="#18181b"
              labelColor="#f5f5f5"
              width={200}
              height={148}
              radius={14}
              spread={180}
              lift={26}
              tilt={8}
              flapAngle={34}
              restAngle={16}
              openDuration={520}
              stagger={45}
              bounce={0.3}
              onSelect={value => { window.location.assign(value); }}
            />
          <a className="redesign-home-feature-card" href={href[locale]}>
            <EnheIconfontIcon icon={Icon} className="redesign-home-feature-icon" />
            <span className="redesign-home-feature-copy">
              <strong>{title[locale]}</strong>
              <span>{description[locale]}</span>
            </span>
          </a>
          </div>
        ))}
      </div>
    </section>
  );
}
