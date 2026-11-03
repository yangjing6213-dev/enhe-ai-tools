import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson } from "@/lib/group-chat/http";
import { getChatManagerScope } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  if (!(await getChatManagerScope(groupId, actor))) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  const entries = await prisma.chatGroupAuditLog.findMany({ where: { groupId }, include: { admin: { select: { nickname: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return chatJson({ entries: entries.map(({ admin, ...entry }) => ({ ...entry, operator: admin.nickname?.trim() || (admin.role === "admin" ? "网站管理员" : "ENHE 用户") })) });
}
