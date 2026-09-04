import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolvePublicNewsArticleSlug } from "@/lib/public-content";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const { slug } = await params;
  const slugMatch = await resolvePublicNewsArticleSlug(slug);
  const article = slugMatch
    ? await prisma.newsArticle.findFirst({ where: { id: slugMatch.id, status: "published" }, select: { id: true } })
    : null;
  if (!article) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const existing = await prisma.newsArticleLike.findUnique({
    where: { articleId_userId: { articleId: article.id, userId: user.id } }
  });
  if (existing) return NextResponse.json({ ok: true, already: true });

  await prisma.$transaction([
    prisma.newsArticleLike.create({ data: { articleId: article.id, userId: user.id } }),
    prisma.newsArticle.update({ where: { id: article.id }, data: { likeCount: { increment: 1 } } })
  ]);

  return NextResponse.json({ ok: true });
}
