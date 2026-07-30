import { Prisma, type OrderStatus, type RefundStatus } from "@prisma/client";
import {
  createAdminAuditCreateData,
  type AuditRequestContext,
} from "@/lib/admin-audit";
import { getOrderTimestampPatch } from "@/lib/admin-order";
import { lockVipEntitlementUser, revokeEntitlementsForRefundedOrder } from "@/lib/membership";
import {
  assertAdminOrderFinancialUpdateAllowed,
  assertAdminOrderStatusUpdateAllowed,
  canRecordRefundForOrder,
  normalizeRefundRecordAmount,
} from "@/lib/order-rules";

export type AdminOrderMutationDb = {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

export type UpdateOrderForAdminInput = {
  db: AdminOrderMutationDb;
  orderId: string;
  adminId: string;
  amount: number;
  paymentMethod: "alipay" | "wechat" | null;
  orderStatus: OrderStatus;
  auditContext: AuditRequestContext;
  now?: Date;
};

export async function updateOrderForAdmin(input: UpdateOrderForAdminInput) {
  return input.db.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
    );
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        paymentTransaction: true,
        refundRecords: { take: 1, select: { id: true } },
      },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");

    assertAdminOrderStatusUpdateAllowed(input.orderStatus, order.orderStatus);
    assertAdminOrderFinancialUpdateAllowed({
      hasPaymentTransaction: Boolean(order.paymentTransaction || order.refundRecords.length),
      currentAmount: Number(order.amount),
      nextAmount: input.amount,
    });

    const timestampPatch = getOrderTimestampPatch(
      input.orderStatus,
      order.paidAt,
      order.activatedAt,
    );
    if (input.now) {
      if (timestampPatch.paidAt && !order.paidAt) timestampPatch.paidAt = input.now;
      if (timestampPatch.activatedAt && !order.activatedAt) timestampPatch.activatedAt = input.now;
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        orderStatus: input.orderStatus,
        ...timestampPatch,
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        orderStatus: true,
        paidAt: true,
        activatedAt: true,
      },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "order.update",
          targetType: "order",
          targetId: order.id,
          summary: "Updated order status, amount, or payment method.",
          metadata: {
            beforeStatus: order.orderStatus,
            orderStatus: input.orderStatus,
            paymentMethod: input.paymentMethod,
            amount: input.amount,
          },
        },
        input.auditContext,
      ),
    });

    return { order: { ...updated, amount: Number(updated.amount) } };
  });
}

export type CreateRefundRecordForAdminInput = {
  db: AdminOrderMutationDb;
  orderId: string;
  adminId: string;
  amount: number | string;
  requestedStatus: RefundStatus;
  reason: string;
  note: string | null;
  refundReceiverQr: string | null;
  refundProofImage: string | null;
  auditContext: AuditRequestContext;
};

export async function createRefundRecordForAdmin(input: CreateRefundRecordForAdminInput) {
  return input.db.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${input.orderId} FOR UPDATE`,
    );
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        paymentTransaction: true,
        refundRecords: { take: 1, select: { id: true } },
      },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (!canRecordRefundForOrder(order.orderStatus)) {
      throw new Error("REFUND_STATUS_NOT_ALLOWED");
    }
    if (
      order.refundRecords.length ||
      order.paymentTransaction?.refundRecordId ||
      order.paymentTransaction?.refundState
    ) {
      throw new Error("REFUND_ATTEMPT_EXISTS");
    }

    const amount = normalizeRefundRecordAmount(input.amount, Number(order.amount));
    const refund = await tx.orderRefundRecord.create({
      data: {
        orderId: order.id,
        adminId: input.adminId,
        amount,
        status: "pending",
        reason: input.reason,
        note: input.note,
        refundReceiverQr: input.refundReceiverQr,
        refundProofImage: input.refundProofImage,
      },
      select: { id: true },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData(
        {
          adminId: input.adminId,
          action: "order.refund.create",
          targetType: "order",
          targetId: order.id,
          summary: "Created pending order after-sales/refund record.",
          metadata: {
            refundId: refund.id,
            amount,
            requestedStatus: input.requestedStatus,
            reason: input.reason,
            refundReceiverQr: input.refundReceiverQr,
            refundProofImage: input.refundProofImage,
          },
        },
        input.auditContext,
      ),
    });

    return {
      refund,
      order: {
        id: order.id,
        userId: order.userId,
        orderNo: order.orderNo,
        amount: Number(order.amount),
      },
    };
  });
}

export type PrepareRefundExecutionForAdminInput = {
  db: AdminOrderMutationDb;
  refundId: string;
  adminId: string;
  note: string | null;
  refundProofImage: string | null;
  now?: Date;
};

export async function prepareRefundExecutionForAdmin(input: PrepareRefundExecutionForAdminInput) {
  const now = input.now ?? new Date();
  return input.db.$transaction(async (tx) => {
    const refundLocator = await tx.orderRefundRecord.findUnique({
      where: { id: input.refundId },
      select: {
        orderId: true,
        order: { select: { orderType: true, userId: true } },
      },
    });
    if (!refundLocator) throw new Error("REFUND_NOT_FOUND");

    if (refundLocator.order.orderType === "vip") {
      await lockVipEntitlementUser(tx, refundLocator.order.userId);
    }

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${refundLocator.orderId} FOR UPDATE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM payment_transactions WHERE order_id = ${refundLocator.orderId} FOR UPDATE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM order_refund_records WHERE id = ${input.refundId} FOR UPDATE`,
    );
    const refund = await tx.orderRefundRecord.findUnique({
      where: { id: input.refundId },
      include: { order: { include: { paymentTransaction: true } } },
    });
    if (!refund) throw new Error("REFUND_NOT_FOUND");
    if (refund.status !== "pending") throw new Error("REFUND_NOT_PENDING");
    if (!refund.amount.equals(refund.order.amount)) {
      throw new Error("REFUND_REQUIRES_FULL_ORDER_AMOUNT");
    }

    const payment = refund.order.paymentTransaction;
    if (payment?.provider === "zpay") return { kind: "zpay" as const };

    await revokeEntitlementsForRefundedOrder(tx, refund.order, now);
    if (payment) {
      await tx.paymentTransaction.update({
        where: { id: payment.id },
        data: { status: "refunded", refundedAt: now },
      });
    }
    await tx.order.update({
      where: { id: refund.orderId },
      data: { orderStatus: "refunded" },
    });
    await tx.orderRefundRecord.update({
      where: { id: refund.id },
      data: {
        adminId: input.adminId,
        status: "completed",
        note: input.note,
        refundProofImage: input.refundProofImage,
        completedAt: refund.completedAt ?? now,
      },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData({
        adminId: input.adminId,
        action: "order.refund.finalized",
        targetType: "order",
        targetId: refund.orderId,
        summary: `Manual refund ${refund.id} finalized and entitlements revoked.`,
        metadata: { refundId: refund.id, paymentProvider: payment?.provider ?? "manual" },
      }),
    });

    return { kind: "manual_finalized" as const, outcome: "finalized" as const };
  });
}

export async function rejectRefundRecordForAdmin(input: PrepareRefundExecutionForAdminInput) {
  return input.db.$transaction(async (tx) => {
    const refundLocator = await tx.orderRefundRecord.findUnique({
      where: { id: input.refundId },
      select: { orderId: true },
    });
    if (!refundLocator) throw new Error("REFUND_NOT_FOUND");

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${refundLocator.orderId} FOR UPDATE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM payment_transactions WHERE order_id = ${refundLocator.orderId} FOR UPDATE`,
    );
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM order_refund_records WHERE id = ${input.refundId} FOR UPDATE`,
    );
    const refund = await tx.orderRefundRecord.findUnique({
      where: { id: input.refundId },
      include: { order: { include: { paymentTransaction: true } } },
    });
    if (!refund) throw new Error("REFUND_NOT_FOUND");
    if (refund.status !== "pending") throw new Error("REFUND_NOT_PENDING");
    const paymentRefundState = refund.order.paymentTransaction?.refundState ?? null;
    if (paymentRefundState !== null && paymentRefundState !== "requested") {
      throw new Error("REFUND_STATE_MISMATCH");
    }

    await tx.orderRefundRecord.update({
      where: { id: refund.id },
      data: {
        adminId: input.adminId,
        status: "rejected",
        note: input.note,
        refundProofImage: input.refundProofImage,
        completedAt: null,
      },
    });
    await tx.adminAuditLog.create({
      data: createAdminAuditCreateData({
        adminId: input.adminId,
        action: "order.refund.provider_rejected",
        targetType: "order",
        targetId: refund.orderId,
        summary: `Refund ${refund.id} rejected by administrator.`,
        metadata: { refundId: refund.id, refundState: "provider_rejected" },
      }),
    });

    return { outcome: "provider_rejected" as const };
  });
}
