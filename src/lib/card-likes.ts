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

// Both increments run in PostgreSQL, so simultaneous visitors cannot overwrite each other.
export async function incrementCardLike(target: CardLikeTarget): Promise<number | null> {
  if (target.kind === "news") {
    const rows = await prisma.$queryRaw<{ like_count: number }[]>`
      UPDATE news_articles SET like_count = like_count + 1, updated_at = NOW()
      WHERE id = ${target.id} AND status = 'published' RETURNING like_count`;
    return rows[0]?.like_count ?? null;
  }
  const key = cardLikeKey(target);
  const rows = await prisma.$queryRaw<{ value: string }[]>`
    INSERT INTO site_settings (id, key, value, created_at, updated_at)
    SELECT ${randomUUID()}, ${key}, '1', NOW(), NOW()
    WHERE EXISTS (SELECT 1 FROM tools WHERE id = ${target.id} AND status = 'published')
    ON CONFLICT (key) DO UPDATE SET value = (site_settings.value::bigint + 1)::text, updated_at = NOW()
    RETURNING value`;
  return rows[0] ? Number(rows[0].value) : null;
}
