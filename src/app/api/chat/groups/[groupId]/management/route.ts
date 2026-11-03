import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson } from "@/lib/group-chat/http";
import { getChatManagerScope, resolvePublicReference } from "@/lib/group-chat/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  const scope = await getChatManagerScope(groupId, actor);
  if (!scope) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [pending, messageCount, speakers, clicks, media, reports, references] = await Promise.all([
    prisma.chatGroupApplication.findMany({ where: { groupId, status: "pending" }, orderBy: { submittedAt: "asc" }, take: 1, select: { submittedAt: true } }),
    prisma.chatGroupMessage.count({ where: { groupId, createdAt: { gte: since } } }),
    prisma.chatGroupMessage.findMany({ where: { groupId, status: "active", createdAt: { gte: since } }, distinct: ["senderId"], select: { senderId: true }, take: 5000 }),
    prisma.chatGroupReferenceStat.aggregate({ where: { groupId }, _sum: { clickCount: true } }),
    prisma.chatGroupMedia.aggregate({ where: { groupId, discardedAt: null }, _sum: { fileSize: true, thumbnailSize: true }, _count: { _all: true } }),
    prisma.chatGroupReport.count({ where: { groupId, status: "pending" } }),
    prisma.chatGroupReferenceStat.findMany({ where: { groupId }, orderBy: { clickCount: "desc" }, take: 20, select: { referenceType: true, referenceId: true, clickCount: true } }),
  ]);
  const referencesWithCurrentDetails = await Promise.all(references.map(async (item) => {
    if (item.referenceType !== "tool" && item.referenceType !== "news") return null;
    const ref = await resolvePublicReference({ type: item.referenceType as "tool" | "news", id: item.referenceId }, prisma);
    return ref ? { ...ref, clickCount: item.clickCount } : null;
  }));
  return chatJson({
    group: { id: scope.group.id, name: scope.group.name, status: scope.group.status, activeMemberCount: scope.group.activeMemberCount, maxMembers: scope.group.maxMembers },
    metrics: {
      pendingApplications: await prisma.chatGroupApplication.count({ where: { groupId, status: "pending" } }),
      oldestPendingHours: pending[0] ? Math.max(0, Math.floor((Date.now() - pending[0].submittedAt.getTime()) / 3_600_000)) : null,
      messagesLast7Days: messageCount,
      activeSpeakersLast7Days: speakers.length,
      referenceClicks: clicks._sum.clickCount ?? 0,
      imageCount: media._count._all,
      imageBytes: (media._sum.fileSize ?? 0) + (media._sum.thumbnailSize ?? 0),
      pendingReports: reports,
    },
    referencedContent: referencesWithCurrentDetails.filter(Boolean),
  });
}
