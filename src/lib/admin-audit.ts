import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AdminAuditInput = {
  adminId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue | null;
};

type AuditRequestContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export function createAdminAuditData(input: AdminAuditInput, context: AuditRequestContext = {}) {
  return {
    adminId: input.adminId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? null,
    ip: context.ip ?? null,
    userAgent: context.userAgent ?? null
  };
}

export async function writeAdminAuditLog(input: AdminAuditInput) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const data = createAdminAuditData(input, {
    ip: forwardedFor?.split(",")[0]?.trim() || headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent")
  });

  await prisma.adminAuditLog.create({
    data: {
      ...data,
      metadata: data.metadata ?? Prisma.JsonNull
    }
  });
}
