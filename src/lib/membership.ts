import { prisma } from "@/lib/db";
import { applyVipCancellation, applyVipGrant, type MembershipSnapshot } from "@/lib/membership-rules";

type MembershipDelegate = {
  membership: Pick<typeof prisma.membership, "create" | "findFirst" | "update">;
};
type RefundEntitlementDelegate = MembershipDelegate & {
  toolPurchase: Pick<typeof prisma.toolPurchase, "deleteMany">;
};

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
  order: { id: string; userId: string; orderType: "vip" | "software_download"; toolId?: string | null },
  now = new Date()
) {
  if (order.orderType === "software_download") {
    await tx.toolPurchase.deleteMany({
      where: {
        OR: [
          { orderId: order.id },
          ...(order.toolId ? [{ userId: order.userId, toolId: order.toolId }] : [])
        ]
      }
    });
    return;
  }

  await cancelVipMembership(tx, order.userId, now);
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
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { plan: true, paymentProof: true }
    });
    if (!order) throw new Error("Order not found.");
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
