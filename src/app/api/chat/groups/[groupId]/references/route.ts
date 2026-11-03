import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";
import { findChatMembership, resolvePublicReference } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  if (!(await findChatMembership(groupId, actor.id))) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  const referenced = await prisma.chatGroupMessage.findMany({
    where: { groupId, status: "active", referenceType: { in: ["tool", "news"] }, referenceId: { not: null } },
    select: { id: true, referenceType: true, referenceId: true, createdAt: true },
    orderBy: { sequence: "desc" },
    distinct: ["referenceType", "referenceId"],
    take: 200,
  });
  const items = await Promise.all(referenced.map(async (message) => {
    if (!message.referenceType || !message.referenceId || (message.referenceType !== "tool" && message.referenceType !== "news")) return null;
    const [reference, stats] = await Promise.all([
      resolvePublicReference({ type: message.referenceType, id: message.referenceId }, prisma),
      prisma.chatGroupReferenceStat.findUnique({ where: { groupId_referenceType_referenceId: { groupId, referenceType: message.referenceType, referenceId: message.referenceId } }, select: { clickCount: true } }),
    ]);
    return reference ? { ...reference, lastMessageId: message.id, lastReferencedAt: message.createdAt, clickCount: stats?.clickCount ?? 0 } : null;
  }));
  return chatJson({ items: items.filter(Boolean) });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  if (!(await findChatMembership(groupId, actor.id))) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "reference_click", limit: 120, windowMs: 60_000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  let body: unknown;
  try { body = await readChatJson(request); } catch { return chatError("CHAT_INVALID_JSON", 400); }
  if (!body || typeof body !== "object") return chatError("CHAT_REFERENCE_INVALID", 400);
  const input = body as { type?: unknown; id?: unknown };
  if ((input.type !== "tool" && input.type !== "news") || typeof input.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(input.id)) return chatError("CHAT_REFERENCE_INVALID", 400);
  if (!(await resolvePublicReference({ type: input.type, id: input.id }, prisma))) return chatError("CHAT_REFERENCE_UNAVAILABLE", 409);
  await prisma.chatGroupReferenceStat.upsert({
    where: { groupId_referenceType_referenceId: { groupId, referenceType: input.type, referenceId: input.id } },
    create: { groupId, referenceType: input.type, referenceId: input.id, clickCount: 1, lastClickedAt: new Date() },
    update: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
  });
  return chatJson({ recorded: true });
}
