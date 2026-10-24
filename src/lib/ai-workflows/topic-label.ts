import type { Locale } from "@/lib/dictionaries";

const topicEnglishFallbacks: Readonly<Record<string, string>> = {
  "工作效率": "Productivity",
  "视频生成": "Video generation",
  "内容创作": "Content creation",
  "编程开发": "Programming & development",
  "学习教育": "Learning & education",
  "搜索研究": "Search & research",
  "营销销售": "Marketing & sales",
  "办公自动化": "Office automation",
  "情感陪伴": "Companionship",
  "财务法律辅助": "Finance & legal support",
};

export function resolveAiWorkflowTopicLabel(
  topic: { name: string; englishName: string | null },
  locale: Locale,
) {
  if (locale === "zh") return topic.name;
  return topic.englishName?.trim() || topicEnglishFallbacks[topic.name] || topic.name;
}
