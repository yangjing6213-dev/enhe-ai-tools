import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolvePublicNewsArticleSlug } from "@/lib/public-content";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const slugMatch = await resolvePublicNewsArticleSlug(slug);
  if (!slugMatch) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.newsArticle.updateMany({
    where: { id: slugMatch.id, status: "published" },
    data: { viewCount: { increment: 1 } }
  });
  return NextResponse.json({ ok: true });
}
