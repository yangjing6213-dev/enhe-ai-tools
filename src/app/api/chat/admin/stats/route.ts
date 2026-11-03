import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson } from "@/lib/group-chat/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (actor.role !== "admin") return chatError("CHAT_ADMIN_REQUIRED", 403);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [groups, activeMembers, pendingApplications, oldestPending, messagesLast7Days, speakers, referenceClicks, media, pendingReports] = await Promise.all([
    prisma.chatGroup.count({ where: { status: { not: "disabled" } } }),
    prisma.chatGroupMember.count({ where: { status: "active", group: { status: { not: "disabled" } } } }),
    prisma.chatGroupApplication.count({ where: { status: "pending", group: { status: "active" } } }),
    prisma.chatGroupApplication.findFirst({ where: { status: "pending", group: { status: "active" } }, orderBy: { submittedAt: "asc" }, select: { submittedAt: true } }),
    prisma.chatGroupMessage.count({ where: { createdAt: { gte: since } } }),
    prisma.chatGroupMessage.findMany({ where: { status: "active", createdAt: { gte: since } }, distinct: ["senderId"], select: { senderId: true }, take: 10000 }),
    prisma.chatGroupReferenceStat.aggregate({ _sum: { clickCount: true } }),
    prisma.chatGroupMedia.aggregate({ where: { discardedAt: null }, _sum: { fileSize: true, thumbnailSize: true }, _count: { _all: true } }),
    prisma.chatGroupReport.count({ where: { status: "pending" } }),
  ]);
  return chatJson({ metrics: {
    groups, activeMembers, pendingApplications,
    oldestPendingHours: oldestPending ? Math.max(0, Math.floor((Date.now() - oldestPending.submittedAt.getTime()) / 3_600_000)) : null,
    messagesLast7Days, activeSpeakersLast7Days: speakers.length,
    referenceClicks: referenceClicks._sum.clickCount ?? 0,
    imageCount: media._count._all,
    imageBytes: (media._sum.fileSize ?? 0) + (media._sum.thumbnailSize ?? 0),
    pendingReports,
  } });
}
