"use client";

import type { RedesignLocale } from "@/components/redesign/types";
import FolderFloat from "@/components/FolderFloat";
import { SOFTWARE_CATEGORIES } from "@/lib/redesign/software/software-categories";
import { trackClientAnalyticsEvent } from "@/components/analytics-tracker";

export const HOME_FEATURES: ReadonlyArray<{
  title: Record<RedesignLocale, string>;
  href: Record<RedesignLocale, string>;
}> = [
  {
    title: { zh: "AI 工具", en: "AI tools" },
    href: { zh: "/software", en: "/en/software" },
  },
  {
    title: { zh: "AI 技能", en: "AI skills" },
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

const SKILL_ITEMS = [
  { zh: "AI 提示词", en: "AI prompts", path: "/skill-learning/ai-prompt-management" },
  { zh: "AI Skills", en: "AI Skills", path: "/ai-skills" },
  { zh: "AI 工作流", en: "AI workflows", path: "/ai-workflows" },
];
const NEWS_ITEMS = [
  { zh: "AI 智能体", en: "AI agents", path: "/ai-news/topics/ai-agent" },
  { zh: "AI 本地部署", en: "Local AI", path: "/ai-news/topics/local-ai" },
  { zh: "开源大模型", en: "Open-source models", path: "/ai-news/topics/open-source-models" },
  { zh: "AI 技能教程", en: "AI tutorials", path: "/ai-news/topics/ai-tutorials" },
  { zh: "AI 监管与安全", en: "AI regulation", path: "/ai-news/topics/ai-regulation" },
];
const HOME_SOFTWARE_CATEGORIES = SOFTWARE_CATEGORIES.filter(category => !["all", "skill"].includes(category.id));

export function EnheRedesignFeatures({ locale }: { locale: RedesignLocale }) {
  return (
    <section
      className="redesign-home-features"
      aria-label={locale === "en" ? "Explore ENHE AI" : "探索 ENHE AI"}
    >
      <div className="redesign-home-features-inner">
        {HOME_FEATURES.map(({ title, href }, index) => (
          <div className="redesign-home-feature-folder" key={href[locale]}>
            <FolderFloat
              label={title[locale]}
              sublabel={locale === "zh" ? "点击或悬停探索" : "Open to explore"}
              items={index === 0
                ? HOME_SOFTWARE_CATEGORIES.map(category => ({ label: category.label[locale], value: `${href[locale]}?category=${category.id}` }))
                : index === 1 || index === 2
                ? (index === 1 ? SKILL_ITEMS : NEWS_ITEMS).map(item => ({ label: item[locale], value: `${locale === "en" ? "/en" : ""}${item.path}` }))
                : [{ label: locale === "zh" ? `查看${title[locale]}` : `Explore ${title[locale]}`, value: href[locale] }]}
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
              spread={index === 0 || index === 2 ? 140 : 180}
              lift={26}
              tilt={8}
              flapAngle={34}
              restAngle={16}
              openDuration={520}
              stagger={45}
              bounce={0.3}
              onSelect={(value, itemIndex) => {
                trackClientAnalyticsEvent({
                  eventName: "home_entry_click",
                  path: window.location.pathname,
                  metadata: {
                    surface: "category_folder",
                    target: index === 0
                      ? `software_${HOME_SOFTWARE_CATEGORIES[itemIndex]?.id ?? "all"}`
                      : value.split(/[?#]/)[0].replace(/^\/en(?=\/)/, "").replaceAll("/", "_"),
                  },
                });
                window.location.assign(value);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
