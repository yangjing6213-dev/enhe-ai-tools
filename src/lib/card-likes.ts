import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

export type CardLikeTarget = { kind: "tool" | "news"; id: string };
export const cardLikeKey = ({ kind, id }: CardLikeTarget) => `card-like:${kind}:${id}`;

export function parseCardLikeTarget(value: unknown): CardLikeTarget | null {
  if (!value || typeof value !== "object") return null;
  const { kind, id } = value as Record<string, unknown>;
  return (kind === "tool" || kind === "news") && typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id)
    ? { kind, id } : null;
}

export async function readCardLikes(targets: CardLikeTarget[]) {
  const [tools, news, settings] = await Promise.all([
    prisma.tool.findMany({ where: { id: { in: targets.filter(t => t.kind === "tool").map(t => t.id) }, status: "published" }, select: { id: true } }),
    prisma.newsArticle.findMany({ where: { id: { in: targets.filter(t => t.kind === "news").map(t => t.id) }, status: "published" }, select: { id: true, likeCount: true } }),
    prisma.siteSetting.findMany({ where: { key: { in: targets.filter(t => t.kind === "tool").map(cardLikeKey) } }, select: { key: true, value: true } }),
  ]);
  const saved = new Map(settings.map(s => [s.key, Number(s.value)]));
  return Object.fromEntries([
    ...tools.map(t => { const key = cardLikeKey({ kind: "tool", id: t.id }); return [key, saved.get(key) ?? 0]; }),
    ...news.map(n => [cardLikeKey({ kind: "news", id: n.id }), n.likeCount]),
  ]);
}

export async function readCardLikedState(targets: CardLikeTarget[], userId: string | undefined) {
  if (!userId) return {};
  const [tools, news] = await Promise.all([
    prisma.toolLike.findMany({ where: { userId, toolId: { in: targets.filter(t => t.kind === "tool").map(t => t.id) }, tool: { status: "published" } }, select: { toolId: true } }),
    prisma.newsArticleLike.findMany({ where: { userId, articleId: { in: targets.filter(t => t.kind === "news").map(t => t.id) }, article: { status: "published" } }, select: { articleId: true } }),
  ]);
  return Object.fromEntries([
    ...tools.map(t => [cardLikeKey({ kind: "tool", id: t.toolId }), true]),
    ...news.map(n => [cardLikeKey({ kind: "news", id: n.articleId }), true]),
  ]);
}

// The published target row serializes concurrent requests. Desired state makes retries idempotent.
export async function setCardLike(target: CardLikeTarget, userId: string, liked: boolean) {
  return prisma.$transaction(async tx => {
    const rows = target.kind === "tool"
      ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM tools WHERE id = ${target.id} AND status = 'published' FOR UPDATE`
      : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM news_articles WHERE id = ${target.id} AND status = 'published' FOR UPDATE`;
    if (!rows.length) return null;
    const existing = target.kind === "tool"
      ? await tx.toolLike.findUnique({ where: { toolId_userId: { toolId: target.id, userId } } })
      : await tx.newsArticleLike.findUnique({ where: { articleId_userId: { articleId: target.id, userId } } });
    const changed = !!existing !== liked;
    if (changed) {
      if (target.kind === "tool") {
        if (liked) await tx.toolLike.create({ data: { toolId: target.id, userId } });
        else await tx.toolLike.delete({ where: { id: existing!.id } });
      } else {
        if (liked) await tx.newsArticleLike.create({ data: { articleId: target.id, userId } });
        else await tx.newsArticleLike.delete({ where: { id: existing!.id } });
      }
    }
    const delta = changed ? (liked ? 1 : -1) : 0;
    if (target.kind === "news") {
      const totals = await tx.$queryRaw<{ like_count: number }[]>`
        UPDATE news_articles SET like_count = GREATEST(0, like_count + ${delta})
        WHERE id = ${target.id} RETURNING like_count`;
      return { count: totals[0].like_count, liked, changed };
    }
    const key = cardLikeKey(target);
    const totals = await tx.$queryRaw<{ value: string }[]>`
      INSERT INTO site_settings (id, key, value, created_at, updated_at)
      VALUES (${randomUUID()}, ${key}, ${String(Math.max(0, delta))}, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET value = GREATEST(0, site_settings.value::bigint + ${delta})::text, updated_at = NOW()
      RETURNING value`;
    return { count: Number(totals[0].value), liked, changed };
  });
}
