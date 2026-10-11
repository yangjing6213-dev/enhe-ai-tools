import { prisma } from "@/lib/db";
import type { RedesignLocale } from "@/components/redesign/types";
import { mapHomepageCommentCards, type HomepageCommentCard } from "./homepage-comment-display";

export async function getHomepageCommentCards(locale: RedesignLocale): Promise<HomepageCommentCard[]> {
  if (!process.env.DATABASE_URL?.trim() && process.env.ENHE_ADMIN_VISUAL_FIXTURE !== "1") return [];

  try {
    const comments = await prisma.comment.findMany({
      where: { status: "approved", showOnHomepage: true },
      select: {
        id: true,
        content: true,
        rating: true,
        tool: { select: { name: true, englishName: true } },
        user: { select: { nickname: true, avatar: true } }
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 5
    });

    return mapHomepageCommentCards(
      comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        rating: comment.rating,
        nickname: comment.user.nickname,
        avatar: comment.user.avatar,
        toolName: comment.tool.name,
        englishToolName: comment.tool.englishName
      })),
      locale
    );
  } catch {
    return [];
  }
}
