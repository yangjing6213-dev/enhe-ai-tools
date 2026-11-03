import { prisma } from "@/lib/db";
import { deleteChatMediaStoredFile } from "@/lib/group-chat/media-storage";

type ExpiredChatMediaCandidate = {
  id: string;
  filePath: string;
  thumbnailPath: string;
  expiresAt: Date;
  purpose: string;
  messageId: string | null;
  discardedAt: Date | null;
  group: { avatarMediaId: string | null };
};

export function isExpiredChatMediaCandidate(candidate: ExpiredChatMediaCandidate, now = new Date()) {
  const unreferencedUpload = candidate.messageId === null && candidate.discardedAt === null;
  const discardedMessageImage = candidate.discardedAt !== null;
  return candidate.expiresAt <= now && candidate.purpose === "message" && (unreferencedUpload || discardedMessageImage) && candidate.group.avatarMediaId !== candidate.id;
}

export async function cleanupExpiredChatMedia(now = new Date(), limit = 100) {
  const candidates = await prisma.chatGroupMedia.findMany({
    where: {
      purpose: "message",
      expiresAt: { lte: now },
      OR: [
        { messageId: null, discardedAt: null },
        { discardedAt: { not: null } },
      ],
    },
    include: { group: { select: { avatarMediaId: true } } },
    orderBy: { expiresAt: "asc" },
    take: Math.max(1, Math.min(500, limit)),
  });
  let cleaned = 0;
  let failed = 0;
  for (const candidate of candidates) {
    if (!isExpiredChatMediaCandidate(candidate, now)) continue;
    try {
      const removed = await Promise.all([
        deleteChatMediaStoredFile(candidate.filePath),
        deleteChatMediaStoredFile(candidate.thumbnailPath),
      ]);
      if (!removed.every(Boolean)) { failed += 1; continue; }
      const result = await prisma.chatGroupMedia.deleteMany({
        where: {
          id: candidate.id,
          purpose: "message",
          expiresAt: { lte: now },
          OR: [
            { messageId: null, discardedAt: null },
            { discardedAt: { not: null } },
          ],
        },
      });
      cleaned += result.count;
      if (result.count !== 1) failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { scanned: candidates.length, cleaned, failed };
}
