import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isForumMediaSameOriginRequest } from "@/lib/forum-media";
import type { Prisma } from "@prisma/client";

export const chatNoStoreHeaders = {
  "Cache-Control": "private, no-store",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff",
};

export function chatJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: chatNoStoreHeaders });
}

export function chatError(code: string, status: number, extra?: Record<string, unknown>) {
  return chatJson({ code, ...extra }, status);
}

export function isChatSameOriginRequest(request: Request) {
  return isForumMediaSameOriginRequest(request);
}

export async function readChatJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 64 * 1024) throw new Error("CHAT_BODY_TOO_LARGE");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 64 * 1024) throw new Error("CHAT_BODY_TOO_LARGE");
  return JSON.parse(text) as unknown;
}

export async function consumeChatRateLimit(input: {
  actorKey: string;
  action: string;
  limit: number;
  windowMs: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const windowStart = new Date(Math.floor(now.getTime() / input.windowMs) * input.windowMs);
  return prisma.$transaction(async (tx) => {
    const row = await tx.chatGroupRateLimit.upsert({
      where: { actorKey_action_windowStart: { actorKey: input.actorKey, action: input.action, windowStart } },
      create: { actorKey: input.actorKey, action: input.action, windowStart, attempts: 1 },
      update: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return row.attempts <= input.limit;
  }, { isolationLevel: "Serializable" });
}

export async function recordChatAudit(tx: Prisma.TransactionClient, input: {
  groupId?: string | null;
  adminId: string;
  action: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await tx.chatGroupAuditLog.create({ data: input });
}
