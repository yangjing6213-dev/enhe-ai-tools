import type { UserRole } from "@prisma/client";

export function getAdminUserDeleteBlockReason(input: {
  currentAdminId: string;
  targetUserId: string;
  targetRole: UserRole;
  remainingAdminCount: number;
}) {
  if (input.currentAdminId === input.targetUserId) return "不能删除当前登录的管理员账号。";
  if (input.targetRole === "admin" && input.remainingAdminCount <= 0) return "至少需要保留一个管理员账号。";
  return null;
}
