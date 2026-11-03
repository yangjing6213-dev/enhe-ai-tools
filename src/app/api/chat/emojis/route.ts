import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { defaultChatEmojis } from "@/lib/group-chat/constants";
import { groupEmojiInputSchema } from "@/lib/group-chat/policy";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const includeInactive = new URL(request.url).searchParams.get("manage") === "1";
  if (includeInactive && actor.role !== "admin") return chatError("CHAT_ADMIN_REQUIRED", 403);
  const custom = await prisma.chatGroupEmoji.findMany({ where: includeInactive ? {} : { active: true }, select: { id: true, shortcode: true, emoji: true, name: true, category: true, sortOrder: true, active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return chatJson({ emojis: [...defaultChatEmojis, ...custom] });
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (actor.role !== "admin") return chatError("CHAT_ADMIN_REQUIRED", 403);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const parsed = groupEmojiInputSchema.safeParse(body);
  if (!parsed.success) return chatError("CHAT_EMOJI_INVALID", 400);
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.chatGroupEmoji.create({ data: { ...parsed.data, createdById: actor.id }, select: { id: true, shortcode: true, emoji: true, name: true, category: true, sortOrder: true, active: true } });
      await recordChatAudit(tx, { adminId: actor.id, action: "emoji_created", targetId: created.id });
      return created;
    });
    return chatJson({ emoji: item }, 201);
  } catch { return chatError("CHAT_EMOJI_DUPLICATE", 409); }
}
