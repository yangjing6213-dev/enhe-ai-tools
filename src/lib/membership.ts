import { Prisma, type OrderType, type PaymentRefundState } from "@prisma/client";
import { prisma } from "@/lib/db";
import { applyVipCancellation, applyVipGrant, type MembershipSnapshot } from "@/lib/membership-rules";

type MembershipDelegate = {
  membership: Pick<typeof prisma.membership, "create" | "findFirst" | "update">;
};
type RefundOrder = {
  id: string;
  userId: string;
  orderType: OrderType;
  toolId?: string | null;
  activatedAt?: Date | null;
  paidAt?: Date | null;
  createdAt?: Date | null;
};
type RefundSafetyDelegate = {
  order: Pick<typeof prisma.order, "findFirst" | "findUnique">;
  vipAdjustmentLog: Pick<typeof prisma.vipAdjustmentLog, "findFirst">;
};
type RefundEntitlementDelegate = MembershipDelegate & RefundSafetyDelegate & {
  $queryRaw: Prisma.TransactionClient["$queryRaw"];
  toolPurchase: Pick<typeof prisma.toolPurchase, "delete" | "findUnique" | "update">;
  seoAuditCredit: Pick<typeof prisma.seoAuditCredit, "updateMany">;
  seoAuditSubscriptionOrder: Pick<
    typeof prisma.seoAuditSubscriptionOrder,
    "findUnique" | "findMany" | "update"
  >;
  seoAuditSubscription: Pick<typeof prisma.seoAuditSubscription, "update">;
  seoAuditSchedule: Pick<typeof prisma.seoAuditSchedule, "updateMany">;
  seoAuditRun: Pick<typeof prisma.seoAuditRun, "count" | "updateMany">;
};

export const VIP_REFUND_RECONCILIATION_REQUIRED = "VIP_REFUND_RECONCILIATION_REQUIRED";
const blockingVipRefundStates: PaymentRefundState[] = [
  "requested",
  "dispatching",
  "provider_succeeded",
  "finalize_retry",
  "ambiguous",
];

export async function lockVipEntitlementUser(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  userId: string,
) {
  const users = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM users
    WHERE id = ${userId}
    FOR UPDATE
  `);
  if (users.length !== 1) throw new Error("VIP_USER_NOT_FOUND");
}

export async function lockSoftwareEntitlement(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  userId: string,
  toolId: string,
) {
  await tx.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`membership:software:${userId}:${toolId}`}, 0)) IS NULL AS "lockAcquired"`,
  );
}

async function assertNoVipRefundInProgress(tx: RefundSafetyDelegate, userId: string) {
  const refundingOrder = await tx.order.findFirst({
    where: {
      userId,
      orderType: "vip",
      OR: [
        { refundRecords: { some: { status: "pending" } } },
        {
          paymentTransaction: {
            is: { refundState: { in: blockingVipRefundStates } },
          },
        },
      ],
    },
    select: { id: true },
  });
  if (refundingOrder) throw new Error(VIP_REFUND_RECONCILIATION_REQUIRED);
}

export async function assertRefundEntitlementRevocationIsSafe(
  tx: RefundSafetyDelegate,
  order: RefundOrder,
) {
  if (order.orderType !== "vip") return;

  let entitlementStartedAt = order.activatedAt ?? order.paidAt ?? order.createdAt;
  if (!entitlementStartedAt) {
    const targetOrder = await tx.order.findUnique({
      where: { id: order.id },
      select: { activatedAt: true, paidAt: true, createdAt: true },
    });
    entitlementStartedAt =
      targetOrder?.activatedAt ?? targetOrder?.paidAt ?? targetOrder?.createdAt ?? null;
  }
  if (!entitlementStartedAt) {
    throw new Error(VIP_REFUND_RECONCILIATION_REQUIRED);
  }

  const [otherFundedOrder, laterManualGrant] = await Promise.all([
    tx.order.findFirst({
      where: {
        id: { not: order.id },
        userId: order.userId,
        orderType: "vip",
        orderStatus: { in: ["paid", "activated"] },
      },
      select: { id: true },
    }),
    tx.vipAdjustmentLog.findFirst({
      where: {
        userId: order.userId,
        actionType: "grant",
        createdAt: { gt: entitlementStartedAt },
      },
      select: { id: true },
    }),
  ]);

  if (otherFundedOrder || laterManualGrant) {
    throw new Error(VIP_REFUND_RECONCILIATION_REQUIRED);
  }
}

async function stopFundedSeoAuditRuns(
  tx: RefundEntitlementDelegate,
  orderId: string,
  now: Date,
) {
  await tx.seoAuditRun.updateMany({
    where: { sourceOrderId: orderId, status: "queued" },
    data: { status: "cancelled", cancelRequestedAt: now },
  });
  await tx.seoAuditRun.updateMany({
    where: { sourceOrderId: orderId, status: "running" },
    data: { status: "cancel_requested", cancelRequestedAt: now },
  });
}

export async function getActiveMembership(userId: string) {
  const now = new Date();
  return prisma.membership.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ isLifetime: true }, { endTime: { gt: now } }]
    },
    include: { plan: true },
    orderBy: [{ isLifetime: "desc" }, { endTime: "desc" }]
  });
}

export async function userHasVip(userId?: string | null) {
  if (!userId) return false;
  return Boolean(await getActiveMembership(userId));
}

export function calculateMembershipEnd(durationDays: number, start = new Date()) {
  if (durationDays <= 0) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end;
}

function toMembershipSnapshot(membership: {
  id: string;
  vipType: string;
  startTime: Date;
  endTime: Date | null;
  isLifetime: boolean;
  status: "active" | "expired" | "cancelled";
} | null): MembershipSnapshot | null {
  if (!membership) return null;
  return {
    id: membership.id,
    vipType: membership.vipType,
    startTime: membership.startTime,
    endTime: membership.endTime,
    isLifetime: membership.isLifetime,
    status: membership.status
  };
}

async function findCurrentMembership(tx: MembershipDelegate, userId: string, now = new Date()) {
  return tx.membership.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ isLifetime: true }, { endTime: { gt: now } }]
    },
    orderBy: [{ isLifetime: "desc" }, { endTime: "desc" }]
  });
}

export async function grantVipMembership(
  tx: MembershipDelegate,
  input: { userId: string; planId?: string | null; vipType: string; durationDays: number; now?: Date }
) {
  const now = input.now ?? new Date();
  const current = await findCurrentMembership(tx, input.userId, now);
  const next = applyVipGrant(toMembershipSnapshot(current), { name: input.vipType, durationDays: input.durationDays }, now);

  if (current) {
    return tx.membership.update({
      where: { id: current.id },
      data: {
        planId: input.planId ?? current.planId,
        vipType: next.vipType,
        startTime: next.startTime,
        endTime: next.endTime,
        isLifetime: next.isLifetime,
        status: next.status
      }
    });
  }

  return tx.membership.create({
    data: {
      userId: input.userId,
      planId: input.planId ?? null,
      vipType: next.vipType,
      startTime: next.startTime,
      endTime: next.endTime,
      isLifetime: next.isLifetime,
      status: next.status
    }
  });
}

export async function cancelVipMembership(tx: MembershipDelegate, userId: string, now = new Date()) {
  const current = await findCurrentMembership(tx, userId, now);
  const next = applyVipCancellation(toMembershipSnapshot(current), now);
  if (!current || !next) return null;

  return tx.membership.update({
    where: { id: current.id },
    data: {
      endTime: next.endTime,
      isLifetime: next.isLifetime,
      status: next.status
    }
  });
}

export async function revokeEntitlementsForRefundedOrder(
  tx: RefundEntitlementDelegate,
  order: RefundOrder,
  now = new Date()
) {
  if (order.orderType === "vip") {
    await lockVipEntitlementUser(tx, order.userId);
  }
  const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM orders
    WHERE id = ${order.id}
    FOR UPDATE
  `);
  if (lockedOrders.length !== 1) {
    throw new Error("Refunded order is missing.");
  }

  await assertRefundEntitlementRevocationIsSafe(tx, order);

  switch (order.orderType) {
    case "vip":
      await cancelVipMembership(tx, order.userId, now);
      return;
    case "software_download": {
      if (!order.toolId) throw new Error("Software order is missing tool binding.");
      await lockSoftwareEntitlement(tx, order.userId, order.toolId);
      const currentPurchase = await tx.toolPurchase.findUnique({
        where: { userId_toolId: { userId: order.userId, toolId: order.toolId } },
        select: { id: true, orderId: true },
      });
      if (!currentPurchase || currentPurchase.orderId !== order.id) return;

      const survivingOrder = await tx.order.findFirst({
        where: {
          id: { not: order.id },
          userId: order.userId,
          toolId: order.toolId,
          orderType: "software_download",
          orderStatus: "activated",
          paidAt: { not: null },
          refundRecords: { none: { status: "pending" } },
        },
        orderBy: [{ activatedAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          amount: true,
          toolPriceSpecId: true,
          toolPriceSpecName: true,
        },
      });
      if (!survivingOrder) {
        await tx.toolPurchase.delete({ where: { id: currentPurchase.id } });
        return;
      }

      await tx.toolPurchase.update({
        where: { id: currentPurchase.id },
        data: {
          orderId: survivingOrder.id,
          amount: survivingOrder.amount,
          toolPriceSpecId: survivingOrder.toolPriceSpecId,
          toolPriceSpecName: survivingOrder.toolPriceSpecName,
        },
      });
      return;
    }
    case "seo_audit_credit":
      await stopFundedSeoAuditRuns(tx, order.id, now);
      await tx.seoAuditCredit.updateMany({
        where: { orderId: order.id },
        data: { remainingRuns: 0, refundedAt: now }
      });
      return;
    case "seo_audit_monitoring": {
      const subscriptionBinding = await tx.seoAuditSubscriptionOrder.findUnique({
        where: { orderId: order.id },
        select: {
          subscriptionId: true,
          subscription: {
            select: {
              project: { select: { normalizedOrigin: true } },
            },
          },
        },
      });
      if (!subscriptionBinding) {
        throw new Error("SEO audit monitoring order is missing subscription binding.");
      }

      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`seo-audit:monitoring:${order.userId}:${subscriptionBinding.subscription.project.normalizedOrigin}`}, 0)) IS NULL AS "lockAcquired"`,
      );

      const lockedSubscriptions = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM seo_audit_subscriptions
        WHERE id = ${subscriptionBinding.subscriptionId}
        FOR UPDATE
      `);
      if (lockedSubscriptions.length !== 1) {
        throw new Error("SEO audit monitoring subscription is missing.");
      }

      const subscriptionOrder = await tx.seoAuditSubscriptionOrder.findUnique({
        where: { orderId: order.id },
        select: {
          subscriptionId: true,
          scheduledRunsGranted: true,
          manualRunsGranted: true,
          refundedAt: true,
          subscription: {
            select: {
              status: true,
              scheduledRunsUsed: true,
              manualRunsRemaining: true,
            },
          },
        }
      });
      if (!subscriptionOrder) {
        throw new Error("SEO audit monitoring order is missing subscription binding.");
      }
      if (subscriptionOrder.subscriptionId !== subscriptionBinding.subscriptionId) {
        throw new Error("SEO audit monitoring subscription binding changed during refund.");
      }
      if (subscriptionOrder.refundedAt) return;

      await stopFundedSeoAuditRuns(tx, order.id, now);
      await tx.seoAuditSubscriptionOrder.update({
        where: { orderId: order.id },
        data: { refundedAt: now }
      });
      const remainingOrders = await tx.seoAuditSubscriptionOrder.findMany({
        where: {
          subscriptionId: subscriptionOrder.subscriptionId,
          orderId: { not: order.id },
          refundedAt: null,
        },
        select: {
          serviceStartsAt: true,
          serviceEndsAt: true,
          scheduledRunsGranted: true,
        },
      });

      if (remainingOrders.length === 0) {
        await tx.seoAuditSubscription.update({
          where: { id: subscriptionOrder.subscriptionId },
          data: {
            status: "refunded",
            maxScheduledRuns: 0,
            scheduledRunsUsed: 0,
            manualRunsRemaining: 0,
          }
        });
        await tx.seoAuditSchedule.updateMany({
          where: { subscriptionId: subscriptionOrder.subscriptionId },
          data: { enabled: false, nextRunAt: null }
        });
        return;
      }

      const [scheduledRunsUsedByOrder, manualRunsUsedByOrder] = await Promise.all([
        tx.seoAuditRun.count({
          where: { sourceOrderId: order.id, kind: "scheduled" },
        }),
        tx.seoAuditRun.count({
          where: { sourceOrderId: order.id, kind: "recheck" },
        }),
      ]);
      const startsAt = new Date(
        Math.min(...remainingOrders.map((binding) => binding.serviceStartsAt.getTime())),
      );
      const expiresAt = new Date(
        Math.max(...remainingOrders.map((binding) => binding.serviceEndsAt.getTime())),
      );
      const maxScheduledRuns = remainingOrders.reduce(
        (total, binding) => total + binding.scheduledRunsGranted,
        0,
      );
      const scheduledRunsUsed = Math.max(
        0,
        subscriptionOrder.subscription.scheduledRunsUsed - scheduledRunsUsedByOrder,
      );
      const unusedManualRunsFromOrder = Math.max(
        0,
        subscriptionOrder.manualRunsGranted - manualRunsUsedByOrder,
      );
      const manualRunsRemaining = Math.max(
        0,
        subscriptionOrder.subscription.manualRunsRemaining - unusedManualRunsFromOrder,
      );
      await tx.seoAuditSubscription.update({
        where: { id: subscriptionOrder.subscriptionId },
        data: {
          status: subscriptionOrder.subscription.status === "paused" ? "paused" : "active",
          startsAt,
          expiresAt,
          maxScheduledRuns,
          scheduledRunsUsed,
          manualRunsRemaining,
        }
      });
      return;
    }
    default: {
      const unsupportedOrderType: never = order.orderType;
      throw new Error(`Unsupported order type: ${unsupportedOrderType}`);
    }
  }
}

export async function manuallyAdjustVip(input: {
  userId: string;
  adminId: string;
  actionType: "grant" | "cancel";
  vipType: string;
  durationDays: number;
  reason: string;
}) {
  if (!input.reason.trim()) throw new Error("Manual VIP adjustment requires a reason.");

  return prisma.$transaction(async (tx) => {
    await lockVipEntitlementUser(tx, input.userId);
    if (input.actionType === "grant") {
      await assertNoVipRefundInProgress(tx, input.userId);
    }
    const before = await findCurrentMembership(tx, input.userId);
    const after =
      input.actionType === "cancel"
        ? await cancelVipMembership(tx, input.userId)
        : await grantVipMembership(tx, {
            userId: input.userId,
            vipType: input.vipType,
            durationDays: input.durationDays
          });

    await tx.vipAdjustmentLog.create({
      data: {
        userId: input.userId,
        adminId: input.adminId,
        actionType: input.actionType,
        reason: input.reason.trim(),
        beforeStatus: before ? JSON.parse(JSON.stringify(toMembershipSnapshot(before))) : null,
        afterStatus: after ? JSON.parse(JSON.stringify(toMembershipSnapshot(after))) : null
      }
    });

    return after;
  });
}

export async function activateVipForOrder(orderId: string, reviewerId?: string, reviewNote?: string) {
  return prisma.$transaction(async (tx) => {
    const orderReference = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, orderType: true, toolId: true }
    });
    if (!orderReference) throw new Error("Order not found.");

    switch (orderReference.orderType) {
      case "seo_audit_credit":
      case "seo_audit_monitoring":
        throw new Error("SEO audit orders require the dedicated payment dispatcher.");
      case "vip": {
        await lockVipEntitlementUser(tx, orderReference.userId);
        const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM orders
          WHERE id = ${orderReference.id}
          FOR UPDATE
        `);
        if (lockedOrders.length !== 1) throw new Error("Order not found.");
        break;
      }
      case "software_download": {
        if (!orderReference.toolId) throw new Error("Software order is missing tool binding.");
        const lockedOrders = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM orders
          WHERE id = ${orderReference.id}
          FOR UPDATE
        `);
        if (lockedOrders.length !== 1) throw new Error("Order not found.");
        await lockSoftwareEntitlement(tx, orderReference.userId, orderReference.toolId);
        break;
      }
      default: {
        const unsupportedOrderType: never = orderReference.orderType;
        throw new Error(`Unsupported order type: ${unsupportedOrderType}`);
      }
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { plan: true, paymentProof: true }
    });
    if (!order) throw new Error("Order not found.");
    if (
      order.userId !== orderReference.userId ||
      order.orderType !== orderReference.orderType ||
      order.toolId !== orderReference.toolId
    ) {
      throw new Error("Order binding changed during activation.");
    }
    if (order.orderStatus === "refunded" || order.orderStatus === "cancelled") return order;

    if (order.orderType === "vip") {
      await assertNoVipRefundInProgress(tx, order.userId);
    }

    const start = new Date();

    if (order.orderStatus === "activated") {
      const entitlementStart = order.activatedAt ?? order.paidAt ?? start;

      if (order.orderType === "software_download") {
        if (!order.toolId) throw new Error("Software order is missing tool binding.");

        await tx.toolPurchase.upsert({
          where: { userId_toolId: { userId: order.userId, toolId: order.toolId } },
          update: {
            amount: order.amount,
            orderId: order.id,
            toolPriceSpecId: order.toolPriceSpecId,
            toolPriceSpecName: order.toolPriceSpecName
          },
          create: {
            userId: order.userId,
            toolId: order.toolId,
            orderId: order.id,
            toolPriceSpecId: order.toolPriceSpecId,
            toolPriceSpecName: order.toolPriceSpecName,
            amount: order.amount
          }
        });
      } else {
        if (!order.planId || !order.plan) throw new Error("VIP order is missing plan binding.");
        const currentMembership = await findCurrentMembership(tx, order.userId);

        if (!currentMembership) {
          await grantVipMembership(tx, {
            userId: order.userId,
            planId: order.planId,
            vipType: order.plan.name,
            durationDays: order.plan.durationDays,
            now: entitlementStart
          });
        }
      }

      await tx.paymentProof.updateMany({
        where: { orderId },
        data: {
          reviewStatus: "approved",
          reviewerId,
          reviewedAt: entitlementStart,
          reviewNote
        }
      });

      return order;
    }

    if (order.orderType === "software_download") {
      if (!order.toolId) throw new Error("Software order is missing tool binding.");

      await tx.toolPurchase.upsert({
        where: { userId_toolId: { userId: order.userId, toolId: order.toolId } },
        update: {
          amount: order.amount,
          orderId: order.id,
          toolPriceSpecId: order.toolPriceSpecId,
          toolPriceSpecName: order.toolPriceSpecName
        },
        create: {
          userId: order.userId,
          toolId: order.toolId,
          orderId: order.id,
          toolPriceSpecId: order.toolPriceSpecId,
          toolPriceSpecName: order.toolPriceSpecName,
          amount: order.amount
        }
      });

      await tx.paymentProof.updateMany({
        where: { orderId },
        data: {
          reviewStatus: "approved",
          reviewerId,
          reviewedAt: start,
          reviewNote
        }
      });

      return tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: "activated",
          paidAt: order.paidAt ?? start,
          activatedAt: start
        }
      });
    }

    if (!order.planId || !order.plan) throw new Error("VIP order is missing plan binding.");
    await grantVipMembership(tx, {
      userId: order.userId,
      planId: order.planId,
      vipType: order.plan.name,
      durationDays: order.plan.durationDays,
      now: start
    });

    await tx.paymentProof.updateMany({
      where: { orderId },
      data: {
        reviewStatus: "approved",
        reviewerId,
        reviewedAt: start,
        reviewNote
      }
    });

    return tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "activated",
        paidAt: order.paidAt ?? start,
        activatedAt: start
      }
    });
  });
}
