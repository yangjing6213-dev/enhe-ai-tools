import type { RedesignLocale } from "@/components/redesign/types";

export type HomepageCommentRecord = {
  id: string;
  content: string;
  toolName: string;
  englishToolName?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  rating?: number | null;
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
  return comments.slice(0, MAX_HOMEPAGE_COMMENT_CARDS).map((comment) => {
    const displayName = comment.nickname?.trim() || (locale === "zh" ? "ENHE AI 用户" : "ENHE AI user");
    return {
      id: comment.id,
      displayName,
      productLabel: locale === "en" ? comment.englishToolName || comment.toolName : comment.toolName,
      quote: comment.content,
      ...(comment.avatar ? { avatarSrc: comment.avatar, avatarAlt: displayName } : {}),
      ...(comment.rating && comment.rating >= 1 && comment.rating <= 5 ? { stars: comment.rating } : {})
    };
  });
}
