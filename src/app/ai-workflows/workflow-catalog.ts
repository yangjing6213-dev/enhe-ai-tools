import type { RedesignLocale } from "@/components/redesign/types";

export const AI_WORKFLOW_CATEGORIES = [
  {
    slug: "work-efficiency",
    label: { zh: "工作效率", en: "Work efficiency" },
    examples: { zh: "搜索趋势 / SaaS 产品发布 / 企业预算", en: "Trend research / SaaS launches / business planning" },
    icon: "briefcase",
  },
  {
    slug: "video-generation",
    label: { zh: "视频生成", en: "Video generation" },
    examples: { zh: "创作者社区 / 模型更新 / 工具榜单", en: "Creator communities / model updates / tool lists" },
    icon: "video",
  },
  {
    slug: "content-creation",
    label: { zh: "内容创作", en: "Content creation" },
    examples: { zh: "社媒讨论 / 模板市场 / 自媒体需求", en: "Social discussions / template markets / creator needs" },
    icon: "sparkles",
  },
  {
    slug: "software-development",
    label: { zh: "编程开发", en: "Software development" },
    examples: { zh: "开发者工具 / GitHub 生态 / IDE 集成", en: "Developer tools / GitHub / IDE integrations" },
    icon: "code",
  },
  {
    slug: "learning-education",
    label: { zh: "学习教育", en: "Learning and education" },
    examples: { zh: "课程产品 / 家庭学习 / 语言学习", en: "Courses / family learning / language learning" },
    icon: "graduation",
  },
  {
    slug: "search-research",
    label: { zh: "搜索研究", en: "Search and research" },
    examples: { zh: "AI 搜索 / 知识库 / 研究助手", en: "AI search / knowledge bases / research assistants" },
    icon: "search",
  },
  {
    slug: "marketing-sales",
    label: { zh: "营销销售", en: "Marketing and sales" },
    examples: { zh: "CRM / 广告素材 / 客户触达", en: "CRM / ad creative / customer outreach" },
    icon: "chart",
  },
  {
    slug: "office-automation",
    label: { zh: "办公自动化", en: "Office automation" },
    examples: { zh: "文档表格 / 会议纪要 / 流程编排", en: "Documents and sheets / meeting notes / workflow orchestration" },
    icon: "panels",
  },
  {
    slug: "emotional-support",
    label: { zh: "情感陪伴", en: "Emotional support" },
    examples: { zh: "消费应用 / 社区反馈 / 长时互动", en: "Consumer apps / community feedback / sustained interaction" },
    icon: "heart",
  },
  {
    slug: "finance-legal-assistance",
    label: { zh: "财务法律辅助", en: "Finance and legal assistance" },
    examples: { zh: "高风险咨询 / 合同审阅 / 合规工具", en: "High-stakes guidance / contract review / compliance tools" },
    icon: "scale",
  },
] as const;

export type AiWorkflowCategory = (typeof AI_WORKFLOW_CATEGORIES)[number];

export function filterAiWorkflowCategories(
  categories: readonly AiWorkflowCategory[],
  query: string,
  locale: RedesignLocale,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "en" ? "en-US" : "zh-CN");
  if (!normalizedQuery) return categories;

  return categories.filter(({ label, examples }) =>
    `${label[locale]} ${examples[locale]}`
      .toLocaleLowerCase(locale === "en" ? "en-US" : "zh-CN")
      .includes(normalizedQuery),
  );
}
