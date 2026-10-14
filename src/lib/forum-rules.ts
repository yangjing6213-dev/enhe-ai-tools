import { z } from "zod";

export const forumCategorySchema = z.enum(["question", "experience", "workflow", "showcase"]);
export type ForumCategory = z.infer<typeof forumCategorySchema>;

export const forumPostInputSchema = z.object({
  category: forumCategorySchema,
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().min(2).max(5000),
});

export const forumReplyInputSchema = z.object({
  content: z.string().trim().min(2).max(2000),
});

export const forumReportInputSchema = z.object({
  reason: z.string().trim().min(2).max(250),
});

export const forumReplyMaxDepth = 5;
export const forumSubmissionWindowMs = 10 * 60 * 1000;
export const forumSubmissionMax = 5;
export const forumLikeWindowMs = 60 * 1000;
export const forumLikeMax = 30;
export const forumReportWindowMs = 24 * 60 * 60 * 1000;
export const forumReportMax = 5;

export function getForumReplyDepth(parentDepth: number) {
  if (!Number.isInteger(parentDepth) || parentDepth < 0 || parentDepth >= forumReplyMaxDepth) return null;
  return parentDepth + 1;
}

export function canCreateForumContent(recentCount: number) {
  return Number.isInteger(recentCount) && recentCount >= 0 && recentCount < forumSubmissionMax;
}

export function canLikeForumContent(recentCount: number) {
  return Number.isInteger(recentCount) && recentCount >= 0 && recentCount < forumLikeMax;
}

export function canReportForumContent(recentCount: number) {
  return Number.isInteger(recentCount) && recentCount >= 0 && recentCount < forumReportMax;
}

export function getForumCategoryLabel(category: ForumCategory, locale: "zh" | "en") {
  const labels = {
    zh: { question: "问题求助", experience: "经验分享", workflow: "工作流交流", showcase: "作品展示" },
    en: { question: "Questions", experience: "Experiences", workflow: "AI workflows", showcase: "Showcase" },
  };
  return labels[locale][category];
}
