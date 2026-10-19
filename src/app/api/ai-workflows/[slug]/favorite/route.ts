import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { slug } = await params;
  const tool = await prisma.tool.findFirst({ where: { slug, type: "ai_workflow", status: "published" }, select: { id: true } });
  if (!tool) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const isFavorite = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "tools" WHERE "id" = ${tool.id} FOR UPDATE`);
    const existing = await tx.aiWorkflowFavorite.findUnique({ where: { userId_toolId: { userId: user.id, toolId: tool.id } } });
    if (existing) await tx.aiWorkflowFavorite.delete({ where: { id: existing.id } });
    else await tx.aiWorkflowFavorite.create({ data: { userId: user.id, toolId: tool.id } });
    const favoriteCount = await tx.aiWorkflowFavorite.count({ where: { toolId: tool.id } });
    return { value: !existing, count: favoriteCount };
  });

  return NextResponse.json({ isFavorite: isFavorite.value, favoriteCount: isFavorite.count }, { headers: { "Cache-Control": "no-store" } });
}
