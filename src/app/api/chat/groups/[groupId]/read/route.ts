import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  let body: unknown;
  try { body = await readChatJson(request); } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const sequence = typeof body === "object" && body !== null ? (body as { sequence?: unknown }).sequence : undefined;
  if (typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 0) return chatError("CHAT_READ_CURSOR_INVALID", 400);
  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, select: { id: true, status: true, lastReadSequence: true } });
    const group = await tx.chatGroup.findUnique({ where: { id: groupId }, select: { status: true, lastSequence: true } });
    if (!membership || membership.status !== "active" || !group || group.status === "disabled") throw new Error("CHAT_GROUP_MEMBER_REQUIRED");
    const cursor = Math.min(sequence, group.lastSequence);
    if (cursor > membership.lastReadSequence) {
      await tx.$executeRaw(Prisma.sql`UPDATE "chat_group_members" SET "last_read_sequence" = GREATEST("last_read_sequence", ${cursor}) WHERE "id" = ${membership.id} AND "status" = 'active'`);
    }
    return { sequence: Math.max(membership.lastReadSequence, cursor) };
  }).catch(() => null);
  if (!result) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  return chatJson(result);
}
