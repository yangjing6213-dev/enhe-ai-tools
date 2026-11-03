import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, consumeChatRateLimit, isChatSameOriginRequest, readChatJson } from "@/lib/group-chat/http";
import { findChatMembership, getChatManagerScope, notifyChatUsers } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  if (!(await getChatManagerScope(groupId, actor))) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  const reports = await prisma.chatGroupReport.findMany({ where: { groupId }, include: { reporter: { select: { id: true, nickname: true, avatar: true, role: true } }, message: { select: { id: true, status: true, text: true, sender: { select: { nickname: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return chatJson({ reports: reports.map(({ reporter, message, ...report }) => ({ ...report, reporter: { id: reporter.id, nickname: reporter.nickname?.trim() || "ENHE 用户", avatar: reporter.avatar, role: reporter.role === "admin" ? "网站管理员" : "成员" }, message: message.status === "active" ? { id: message.id, text: message.text, sender: message.sender.nickname?.trim() || "ENHE 用户" } : { id: message.id, text: "消息已不可用", sender: "ENHE 用户" } })) });
}

export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  if (!(await findChatMembership(groupId, actor.id))) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  if (!(await consumeChatRateLimit({ actorKey: `${actor.id}:${groupId}`, action: "report", limit: 5, windowMs: 60 * 60 * 1000 }))) return chatError("CHAT_RATE_LIMIT", 429);
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!messageId || Array.from(reason).length < 2 || Array.from(reason).length > 1000) return chatError("CHAT_REPORT_INVALID", 400);
  const message = await prisma.chatGroupMessage.findFirst({ where: { id: messageId, groupId, status: "active" }, select: { id: true } });
  if (!message) return chatError("CHAT_MESSAGE_NOT_FOUND", 404);
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, select: { ownerId: true, name: true } });
  const managers = await prisma.chatGroupMember.findMany({ where: { groupId, status: "active", role: { in: ["owner", "admin"] } }, select: { userId: true } });
  const report = await prisma.chatGroupReport.create({ data: { groupId, messageId, reporterId: actor.id, reason }, select: { id: true, status: true, createdAt: true } });
  if (group) await prisma.$transaction((tx) => notifyChatUsers(tx, [group.ownerId, ...managers.map(({ userId }) => userId)], actor.id, { type: "chat_group_report", title: `群聊举报：${group.name}`, content: "群内有一条新举报，请查看并处理。", linkUrl: `/admin/chat-groups/${groupId}?tab=reports` }));
  return chatJson({ report }, 201);
}
