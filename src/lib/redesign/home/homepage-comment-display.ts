import type { RedesignLocale } from "@/components/redesign/types";

export type HomepageCommentRecord = {
  id: string;
  content: string;
  toolName: string;
  englishToolName?: string | null;
};

export type HomepageCommentCard = {
  id: string;
  displayName: string;
  productLabel: string;
  quote: string;
  avatarSrc?: string;
  avatarAlt?: string;
  stars?: number;
};

export const MAX_HOMEPAGE_COMMENT_CARDS = 5;

export function mapHomepageCommentCards(
  comments: readonly HomepageCommentRecord[],
  locale: RedesignLocale
): HomepageCommentCard[] {
  return comments.slice(0, MAX_HOMEPAGE_COMMENT_CARDS).map((comment) => ({
    id: comment.id,
    displayName: locale === "zh" ? "ENHE AI 用户" : "ENHE AI user",
    productLabel: locale === "en" ? comment.englishToolName || comment.toolName : comment.toolName,
    quote: comment.content
  }));
}
