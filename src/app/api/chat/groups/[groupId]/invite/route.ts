import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { chatError, chatJson, isChatSameOriginRequest, readChatJson, recordChatAudit } from "@/lib/group-chat/http";
import { decryptChatInviteToken } from "@/lib/group-chat/security";
import { getChatManagerScope, makeInviteRecord } from "@/lib/group-chat/service";
import { groupChatSiteOrigin } from "@/lib/group-chat/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

async function invitePayload(groupId: string) {
  const invite = await prisma.chatGroupInvite.findUnique({ where: { groupId } });
  if (!invite) return null;
  let token: string;
  try { token = decryptChatInviteToken(invite.tokenCiphertext); } catch { return null; }
  return { link: new URL(`/chat/invite/${token}`, groupChatSiteOrigin()).toString(), expiresAt: invite.expiresAt, paused: Boolean(invite.pausedAt), resetAt: invite.resetAt };
}

export async function GET(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  const { groupId } = await params;
  const manager = await getChatManagerScope(groupId, actor);
  if (!manager) {
    const member = await prisma.chatGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: actor.id } }, select: { status: true } });
    const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, select: { allowMemberInvites: true } });
    if (member?.status !== "active" || !group?.allowMemberInvites) return chatError("CHAT_GROUP_MEMBER_REQUIRED", 403);
  }
  const invite = await invitePayload(groupId);
  return invite ? chatJson({ invite }) : chatError("CHAT_INVITE_UNAVAILABLE", 404);
}

export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return chatError("CHAT_LOGIN_REQUIRED", 401);
  if (!isChatSameOriginRequest(request)) return chatError("CHAT_ORIGIN_INVALID", 403);
  const { groupId } = await params;
  if (!(await getChatManagerScope(groupId, actor))) return chatError("CHAT_GROUP_MANAGER_REQUIRED", 403);
  let body: Record<string, unknown>;
  try { body = await readChatJson(request) as Record<string, unknown>; } catch { return chatError("CHAT_INVALID_JSON", 400); }
  const action = body.action;
  const expiresAt = body.expiresAt === null || body.expiresAt === "" ? null : typeof body.expiresAt === "string" ? new Date(body.expiresAt) : undefined;
  if (action === "expiry" && expiresAt !== null && (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) return chatError("CHAT_INVITE_EXPIRY_INVALID", 400);
  if (!["pause", "resume", "reset", "expiry"].includes(String(action))) return chatError("CHAT_INVITE_ACTION_INVALID", 400);

  try {
    const newInvite = action === "reset" ? makeInviteRecord(groupId) : null;
    await prisma.$transaction(async (tx) => {
      const current = await tx.chatGroupInvite.findUnique({ where: { groupId }, select: { id: true } });
      if (!current) throw new Error("CHAT_INVITE_UNAVAILABLE");
      if (action === "reset" && newInvite) await tx.chatGroupInvite.update({ where: { groupId }, data: { tokenHash: newInvite.record.tokenHash, tokenCiphertext: newInvite.record.tokenCiphertext, resetAt: newInvite.record.resetAt, pausedAt: null } });
      if (action === "pause") await tx.chatGroupInvite.update({ where: { groupId }, data: { pausedAt: new Date() } });
      if (action === "resume") await tx.chatGroupInvite.update({ where: { groupId }, data: { pausedAt: null } });
      if (action === "expiry") await tx.chatGroupInvite.update({ where: { groupId }, data: { expiresAt: expiresAt ?? null } });
      await recordChatAudit(tx, { groupId, adminId: actor.id, action: `invite_${String(action)}`, metadata: action === "expiry" ? { expiresAt: expiresAt?.toISOString() ?? null } : undefined });
    }, { isolationLevel: "Serializable" });
    const invite = await invitePayload(groupId);
    return invite ? chatJson({ invite }) : chatError("CHAT_INVITE_UNAVAILABLE", 404);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return chatError(code.startsWith("CHAT_") ? code : "CHAT_INVITE_UPDATE_FAILED", code === "CHAT_INVITE_UNAVAILABLE" ? 404 : 500);
  }
}
