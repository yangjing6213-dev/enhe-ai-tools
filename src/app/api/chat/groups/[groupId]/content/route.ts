import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, consumeChatRateLimit } from "@/lib/group-chat/http";
import { groupChatCopy } from "@/lib/group-chat/constants";
import { findChatMembership, resolvePublicReference } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  if (!(await findChatMembership(groupId, actor.id))) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "content_search", limit: groupChatCopy.searchLimitPerMinute, windowMs: 60_000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!query || (type !== "tool" && type !== "news")) return chatJson({ items: [] });
  if (type === "tool") {
    const rows = await prisma.tool.findMany({ where: { status: "published", OR: [{ name: { contains: query, mode: "insensitive" } }, { englishName: { contains: query, mode: "insensitive" } }, { shortDescription: { contains: query, mode: "insensitive" } }] }, select: { id: true, type: true }, orderBy: { updatedAt: "desc" }, take: 20 });
    const items = (await Promise.all(rows.map(async (row) => {
      const reference = await resolvePublicReference({ type: "tool", id: row.id }, prisma);
      return reference ? { ...reference, category: row.type } : null;
    }))).filter(Boolean);
    return chatJson({ items });
  }
  const rows = await prisma.newsArticle.findMany({ where: { status: "published", OR: [{ title: { contains: query, mode: "insensitive" } }, { englishTitle: { contains: query, mode: "insensitive" } }, { summary: { contains: query, mode: "insensitive" } }] }, select: { id: true }, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }], take: 20 });
  const items = (await Promise.all(rows.map((row) => resolvePublicReference({ type: "news", id: row.id }, prisma)))).filter(Boolean);
  return chatJson({ items });
}
