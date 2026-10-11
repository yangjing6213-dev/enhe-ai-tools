import { notFound } from "next/navigation";

import { AiSkillsCatalog, type AiSkillCatalogEntry } from "@/app/ai-skills/ai-skills-catalog";

const sampleEntries: AiSkillCatalogEntry[] = [
  {
    categoryLabel: "AI Skill",
    product: {
      id: "preview-ai-writing-skill",
      type: "ai_skill",
      secondaryName: "AI writing workflow",
      isPaid: false,
      highlights: ["AI Skill", "免费体验", "权限清晰"],
      downloadCount: 8,
      usageCount: 0,
      categoryId: "skill",
      name: "AI 文案整理 Skill",
      description: "把长内容整理为摘要与行动清单。",
      price: "免费",
      detailHref: "/ai-skills/ai-writing-skill",
      media: null,
    },
  },
  {
    categoryLabel: "AI Skill",
    product: {
      id: "preview-local-debugging-skill",
      type: "ai_skill",
      secondaryName: "Local debugging Skill",
      isPaid: false,
      highlights: ["AI Skill", "免费体验", "权限清晰"],
      downloadCount: 3,
      usageCount: 0,
      categoryId: "skill",
      name: "本地开发排错 Skill",
      description: "定位开发问题并记录可重复的验证步骤。",
      price: "免费",
      detailHref: "/ai-skills/local-debugging-skill",
      media: null,
    },
  },
];

export default function AiSkillsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="redesign-software redesign-software-page">
      <section className="redesign-software-hero">
        <h1>AI Skill</h1>
        <p className="redesign-software-intro">可安装到常见 AI 助手中的专业工作技能。</p>
      </section>
      <AiSkillsCatalog
        entries={sampleEntries}
        locale="zh"
        initialQuery=""
        searchLabel="搜索 Skill 名称或用途"
        emptyTitle="没有找到匹配的 AI Skill"
        emptyText="试试更短的关键词。"
      />
    </main>
  );
}
