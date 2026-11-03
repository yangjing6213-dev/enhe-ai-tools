import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ emojiId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (actor.role !== "admin") return chatError("CHAT_ADMIN_REQUIRED", 403);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { emojiId } = await params;
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  if (typeof body.active !== "boolean") return chatError("CHAT_EMOJI_INVALID", 400);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.chatGroupEmoji.updateMany({ where: { id: emojiId }, data: { active: body.active as boolean } });
    if (updated.count !== 1) throw new Error("CHAT_EMOJI_NOT_FOUND");
    await recordChatAudit(tx, { adminId: actor.id, action: body.active ? "emoji_activated" : "emoji_deactivated", targetId: emojiId });
    return tx.chatGroupEmoji.findUnique({ where: { id: emojiId }, select: { id: true, active: true } });
  }).catch(() => null);
  return result ? chatJson({ emoji: result }) : chatError("CHAT_EMOJI_NOT_FOUND", 404);
}
