import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson } from "@/lib/group-chat/http";
import { findChatMembership } from "@/lib/group-chat/service";
import { chatMessageInclude, serializeChatMessages } from "@/lib/group-chat/serializers";
import { eventPageCursor } from "@/lib/group-chat/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  if (!(await findChatMembership(groupId, actor.id))) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  const after = Number(new URL(request.url).searchParams.get("after") ?? 0);
  if (!Number.isSafeInteger(after) || after < 0) return chatError("CHAT_EVENT_CURSOR_INVALID", 400);
  const events = await prisma.chatGroupEvent.findMany({
      where: { groupId, sequence: { gt: after } },
      include: { message: { include: chatMessageInclude } },
      orderBy: { sequence: "asc" },
      take: 200,
    });
  const messages = await serializeChatMessages(events.flatMap((event) => event.message ? [event.message] : []));
  let messageIndex = 0;
  const serializedEvents = events.map(({ message, ...event }) => ({
    ...event,
    message: message ? messages[messageIndex++] : null,
  }));
  const cursor = eventPageCursor(after, events, 200);
  return chatJson({
    events: serializedEvents,
    // Advance only through the returned page. Jumping to the group's latest
    // sequence would skip events when a busy group has more than 200 pending.
    ...cursor,
  });
}
