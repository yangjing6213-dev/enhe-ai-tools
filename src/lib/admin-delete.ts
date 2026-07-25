import { Prisma, type PrismaClient, type ToolType } from "@prisma/client";
import {
  createAdminAuditCreateData,
  type AuditRequestContext,
} from "@/lib/admin-audit";
import {
  ADMIN_DELETE_CONFLICT,
  decideAdminOrderHardDelete,
  decideAdminToolHardDelete,
  decideAdminUserHardDelete,
  getAdminDeleteConflictCode,
} from "@/lib/admin-delete-protection";
import { getAdminUserDeleteBlockReason } from "@/lib/admin-user-rules";

type AdminDeleteInput = {
  db: PrismaClient;
  adminId: string;
  auditContext?: AuditRequestContext;
};

export async function deleteOrderForAdmin(
  input: AdminDeleteInput & { orderId: string },
) {
  return input.db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "orders"
      WHERE "id" = ${input.orderId}
      FOR UPDATE
    `);
    if (!locked.length) return { status: "not_found" as const };

    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        orderNo: true,
        orderStatus: true,
        isTestData: true,
        paymentTransaction: { select: { id: true } },
        paymentProof: { select: { id: true } },
        toolPurchase: { select: { id: true } },
        seoAuditCredit: { select: { id: true } },
        seoAuditSubscriptionOrder: { select: { id: true } },
        _count: { select: { refundRecords: true, seoAuditRuns: true } },
      },
    });
    if (!order) return { status: "not_found" as const };

    const decision = decideAdminOrderHardDelete({
      orderStatus: order.orderStatus,
      isTestData: order.isTestData,
      protectedCounts: {
        paymentTransaction: order.paymentTransaction ? 1 : 0,
        paymentProof: order.paymentProof ? 1 : 0,
        refundRecords: order._count.refundRecords,
        toolPurchase: order.toolPurchase ? 1 : 0,
        seoAuditCredit: order.seoAuditCredit ? 1 : 0,
        seoAuditSubscriptionOrder: order.seoAuditSubscriptionOrder ? 1 : 0,
        seoAuditRuns: order._count.seoAuditRuns,
      },
    });
    if (!decision.allowed) {
      return { status: "blocked" as const, code: decision.code };
    }

    await savepoint(tx, "admin_order_delete");
    try {
      const deleted = await tx.order.deleteMany({
        where: {
          id: order.id,
          orderStatus: "cancelled",
          isTestData: true,
        },
      });
      if (deleted.count !== 1) {
        await rollbackSavepoint(tx, "admin_order_delete");
        return { status: "blocked" as const, code: ADMIN_DELETE_CONFLICT };
      }
      await releaseSavepoint(tx, "admin_order_delete");
    } catch (error) {
      await rollbackSavepoint(tx, "admin_order_delete");
      const code = getAdminDeleteConflictCode(error);
      if (code) return { status: "blocked" as const, code };
      throw error;
    }

    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "order.delete",
          targetType: "order",
          targetId: order.id,
          summary: "Deleted a relationship-free cancelled test order.",
          metadata: {
            orderNo: order.orderNo,
            orderStatus: order.orderStatus,
            isTestData: order.isTestData,
          },
        },
        input.auditContext,
      ),
    });

    return { status: "deleted" as const, orderId: order.id };
  });
}

export async function deleteUserForAdmin(
  input: AdminDeleteInput & { userId: string },
) {
  return input.db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "users"
      WHERE "id" = ${input.userId}
      FOR UPDATE
    `);
    if (!locked.length) return { status: "not_found" as const };

    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        nickname: true,
        role: true,
        status: true,
        isTestData: true,
        _count: {
          select: {
            orders: true,
            memberships: true,
            paymentProofs: true,
            reviewedProofs: true,
            comments: true,
            downloadLogs: true,
            toolUsageLogs: true,
            analyticsEvents: true,
            toolPurchases: true,
            vipAdjustments: true,
            vipOperations: true,
            refundRecords: true,
            refundRequests: true,
            adminAuditLogs: true,
            sessions: true,
            notifications: true,
            newsFavorites: true,
            newsLikes: true,
            seoAuditProjects: true,
            seoAuditRuns: true,
            seoAuditCredits: true,
            seoAuditSubscriptions: true,
          },
        },
      },
    });
    if (!user) return { status: "not_found" as const };

    const remainingAdminCount = await tx.user.count({
      where: { role: "admin", id: { not: user.id } },
    });
    const blockReason = getAdminUserDeleteBlockReason({
      currentAdminId: input.adminId,
      targetUserId: user.id,
      targetRole: user.role,
      remainingAdminCount,
    });
    if (blockReason) {
      return {
        status: "rule_blocked" as const,
        message: blockReason,
      };
    }

    const decision = decideAdminUserHardDelete({
      isTestData: user.isTestData,
      protectedCounts: user._count,
    });
    if (!decision.allowed) {
      await disableUserWithAudit({
        tx,
        user,
        adminId: input.adminId,
        code: decision.code,
        auditContext: input.auditContext,
      });
      return {
        status: "blocked" as const,
        code: decision.code,
        disabled: true as const,
      };
    }

    await savepoint(tx, "admin_user_delete");
    try {
      const deleted = await tx.user.deleteMany({
        where: { id: user.id, isTestData: true },
      });
      if (deleted.count !== 1) {
        await rollbackSavepoint(tx, "admin_user_delete");
        await disableUserWithAudit({
          tx,
          user,
          adminId: input.adminId,
          code: ADMIN_DELETE_CONFLICT,
          auditContext: input.auditContext,
        });
        return {
          status: "blocked" as const,
          code: ADMIN_DELETE_CONFLICT,
          disabled: true as const,
        };
      }
      await releaseSavepoint(tx, "admin_user_delete");
    } catch (error) {
      await rollbackSavepoint(tx, "admin_user_delete");
      const code = getAdminDeleteConflictCode(error);
      if (!code) throw error;
      await disableUserWithAudit({
        tx,
        user,
        adminId: input.adminId,
        code,
        auditContext: input.auditContext,
      });
      return {
        status: "blocked" as const,
        code,
        disabled: true as const,
      };
    }

    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "user.delete",
          targetType: "user",
          targetId: user.id,
          summary: "Deleted an empty test user.",
          metadata: {
            email: user.email,
            phone: user.phone,
            nickname: user.nickname,
            role: user.role,
            isTestData: user.isTestData,
          },
        },
        input.auditContext,
      ),
    });

    return { status: "deleted" as const, userId: user.id };
  });
}

export async function deleteToolForAdmin(
  input: AdminDeleteInput & { toolId: string; toolType: ToolType },
) {
  return input.db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "tools"
      WHERE "id" = ${input.toolId}
      FOR UPDATE
    `);
    if (!locked.length) return { status: "not_found" as const };

    const tool = await tx.tool.findUnique({
      where: { id: input.toolId },
      select: { id: true, name: true, slug: true },
    });
    if (!tool) return { status: "not_found" as const };

    const priceSpecs = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "tool_price_specs"
      WHERE "tool_id" = ${tool.id}
      FOR UPDATE
    `);
    const priceSpecIds = priceSpecs.map((priceSpec) => priceSpec.id);
    const [orders, purchases] = await Promise.all([
      tx.order.count({
        where: {
          OR: [
            { toolId: tool.id },
            { toolPriceSpecId: { in: priceSpecIds } },
          ],
        },
      }),
      tx.toolPurchase.count({
        where: {
          OR: [
            { toolId: tool.id },
            { toolPriceSpecId: { in: priceSpecIds } },
          ],
        },
      }),
    ]);
    const decision = decideAdminToolHardDelete({ orders, purchases });
    if (!decision.allowed) {
      return { status: "blocked" as const, code: decision.code };
    }

    await savepoint(tx, "admin_tool_delete");
    let cleanup:
      | {
          downloadLogs: number;
          usageLogs: number;
          comments: number;
          tutorials: number;
          faqs: number;
          changelogs: number;
          tagLinks: number;
          files: number;
          priceSpecs: number;
        }
      | undefined;
    try {
      const results = await Promise.all([
        tx.downloadLog.deleteMany({ where: { toolId: tool.id } }),
        tx.toolUsageLog.deleteMany({ where: { toolId: tool.id } }),
        tx.comment.deleteMany({ where: { toolId: tool.id } }),
        tx.tutorial.deleteMany({ where: { toolId: tool.id } }),
        tx.toolFaq.deleteMany({ where: { toolId: tool.id } }),
        tx.toolChangelog.deleteMany({ where: { toolId: tool.id } }),
        tx.toolTagLink.deleteMany({ where: { toolId: tool.id } }),
        tx.file.updateMany({ where: { toolId: tool.id }, data: { toolId: null } }),
        tx.toolPriceSpec.deleteMany({ where: { id: { in: priceSpecIds } } }),
      ]);
      const deleted = await tx.tool.deleteMany({ where: { id: tool.id } });
      if (deleted.count !== 1) {
        await rollbackSavepoint(tx, "admin_tool_delete");
        return { status: "blocked" as const, code: ADMIN_DELETE_CONFLICT };
      }
      cleanup = {
        downloadLogs: results[0].count,
        usageLogs: results[1].count,
        comments: results[2].count,
        tutorials: results[3].count,
        faqs: results[4].count,
        changelogs: results[5].count,
        tagLinks: results[6].count,
        files: results[7].count,
        priceSpecs: results[8].count,
      };
      await releaseSavepoint(tx, "admin_tool_delete");
    } catch (error) {
      await rollbackSavepoint(tx, "admin_tool_delete");
      const code = getAdminDeleteConflictCode(error);
      if (code) return { status: "blocked" as const, code };
      throw error;
    }

    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "tool.delete",
          targetType: "tool",
          targetId: tool.id,
          summary: "Deleted a tool without order or purchase evidence.",
          metadata: {
            type: input.toolType,
            name: tool.name,
            slug: tool.slug,
            cleanup,
          },
        },
        input.auditContext,
      ),
    });

    return { status: "deleted" as const, toolId: tool.id };
  });
}

async function disableUserWithAudit(input: {
  tx: Prisma.TransactionClient;
  user: {
    id: string;
    status: string;
    isTestData: boolean;
    _count: Record<string, number>;
  };
  adminId: string;
  code: string;
  auditContext?: AuditRequestContext;
}) {
  await input.tx.user.update({
    where: { id: input.user.id },
    data: { status: "disabled" },
  });
  await input.tx.adminAuditLog.create({
    data: createAdminAuditCreateData(
      {
        adminId: input.adminId,
        action: "user.delete.protected_disabled",
        targetType: "user",
        targetId: input.user.id,
        summary: "Blocked hard deletion and disabled the user.",
        metadata: {
          code: input.code,
          priorStatus: input.user.status,
          isTestData: input.user.isTestData,
          protectedCounts: input.user._count,
        },
      },
      input.auditContext,
    ),
  });
}

async function savepoint(tx: Prisma.TransactionClient, name: string) {
  await tx.$executeRawUnsafe(`SAVEPOINT ${name}`);
}

async function rollbackSavepoint(tx: Prisma.TransactionClient, name: string) {
  await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`);
  await releaseSavepoint(tx, name);
}

async function releaseSavepoint(tx: Prisma.TransactionClient, name: string) {
  await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
}
