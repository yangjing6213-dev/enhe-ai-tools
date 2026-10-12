"use client";

import type { RedesignLocale } from "@/components/redesign/types";
import FolderFloat from "@/components/FolderFloat";

export const HOME_FEATURES: ReadonlyArray<{
  title: Record<RedesignLocale, string>;
  href: Record<RedesignLocale, string>;
}> = [
  {
    title: { zh: "AI 工具", en: "AI tools" },
    href: { zh: "/software", en: "/en/software" },
  },
  {
    title: { zh: "实用技能", en: "Practical skills" },
    href: { zh: "/ai-skills", en: "/en/ai-skills" },
  },
  {
    title: { zh: "AI 资讯", en: "AI news" },
    href: { zh: "/ai-news", en: "/en/ai-news" },
  },
  {
    title: { zh: "AI 趋势", en: "AI trends" },
    href: { zh: "/ai-trends", en: "/en/ai-trends" },
  },
];

export function EnheRedesignFeatures({ locale }: { locale: RedesignLocale }) {
  return (
    <section
      className="redesign-home-features"
      aria-label={locale === "en" ? "Explore ENHE AI" : "探索 ENHE AI"}
    >
      <div className="redesign-home-features-inner">
        {HOME_FEATURES.map(({ title, href }) => (
          <div className="redesign-home-feature-folder" key={href[locale]}>
            <FolderFloat
              label={title[locale]}
              sublabel={locale === "zh" ? "点击或悬停探索" : "Open to explore"}
              items={[{ label: locale === "zh" ? `查看${title[locale]}` : `Explore ${title[locale]}`, value: href[locale] }]}
              trigger="hover"
              closeOnSelect
              physics
              drift={0.5}
              folderColor="#f5f5f5"
              frontColor="#3b82f6"
              paperColor="#ffffff"
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
          </div>
        ))}
      </div>
    </section>
  );
}
