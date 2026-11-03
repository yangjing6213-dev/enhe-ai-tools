import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { getChatManagerScope } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { reportId } = await params;
  const report = await prisma.chatGroupReport.findUnique({ where: { id: reportId }, select: { id: true, groupId: true, status: true } });
  if (!report) return chatError("CHAT_REPORT_NOT_FOUND", 404);
  if (!(await getChatManagerScope(report.groupId, actor))) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const status = body.status;
  const resolution = typeof body.resolution === "string" ? body.resolution.trim().slice(0, 1000) : "";
  if ((status !== "resolved" && status !== "dismissed") || resolution.length < 2) return chatError("CHAT_REPORT_RESOLUTION_INVALID", 400);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.chatGroupReport.updateMany({ where: { id: report.id, status: "pending" }, data: { status, resolution, resolvedById: actor.id, resolvedAt: new Date() } });
    if (updated.count !== 1) throw new Error("CHAT_REPORT_ALREADY_RESOLVED");
    await recordChatAudit(tx, { groupId: report.groupId, adminId: actor.id, action: `report_${status}`, targetId: report.id, reason: resolution });
    return tx.chatGroupReport.findUnique({ where: { id: report.id }, select: { id: true, status: true, resolution: true, resolvedAt: true } });
  }).catch(() => null);
  return result ? chatJson({ report: result }) : chatError("CHAT_REPORT_ALREADY_RESOLVED", 409);
}
