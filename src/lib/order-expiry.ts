import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAdminAuditCreateData } from "@/lib/admin-audit";
import { isOrderPaymentExpired, unpaidOrderTimeoutMs } from "@/lib/order-payment-deadline";
import { loadZpayConfig, type ZpayConfig } from "@/lib/zpay-config";
import { queryZpayOrder } from "@/lib/zpay-order-query";

const onlineOrderTypes = ["software_download", "seo_audit_credit", "seo_audit_monitoring"] as const;
const evidence = { paymentTransaction: true, paymentProof: true, toolPurchase: true, seoAuditCredit: true, seoAuditSubscriptionOrder: true } satisfies Prisma.OrderInclude;
type ExpiryOrder = Prisma.OrderGetPayload<{ include: typeof evidence }>;
type Dependencies = { db?: typeof prisma; config?: ZpayConfig; now?: () => Date; queryOrder?: typeof queryZpayOrder };
export type OrderExpiryResult = "cancelled" | "held" | "unchanged";

function eligible(order: ExpiryOrder, now: Date) {
  return order.orderStatus === "pending_payment" &&
    (onlineOrderTypes as readonly string[]).includes(order.orderType) &&
    isOrderPaymentExpired(order.createdAt, now) &&
    !order.paidAt && !order.activatedAt && !order.paymentProof && !order.toolPurchase &&
    !order.seoAuditCredit && !order.seoAuditSubscriptionOrder &&
    !order.paymentTransaction?.paidAt &&
    order.paymentTransaction?.status !== "paid" && order.paymentTransaction?.status !== "refunded";
}

function creationState(order: ExpiryOrder) {
  const raw = order.paymentTransaction?.rawResponse;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw.creationState : null;
}

export async function expireUnpaidOrder(orderId: string, dependencies: Dependencies = {}): Promise<OrderExpiryResult> {
  const db = dependencies.db ?? prisma;
  const now = dependencies.now?.() ?? new Date();
  const snapshot = await db.order.findUnique({ where: { id: orderId }, include: evidence });
  if (!snapshot || !eligible(snapshot, now)) return "unchanged";
  const payment = snapshot.paymentTransaction;
  let canCancel = !payment;
  if (payment) {
    // A request claimed shortly before the deadline can still be in flight.
    const inFlight = creationState(snapshot) === "dispatching" && now.getTime() - payment.updatedAt.getTime() < 30_000;
    if (payment.provider === "zpay" && !inFlight) {
      try {
        const result = await (dependencies.queryOrder ?? queryZpayOrder)(
          { ...snapshot, providerTradeNo: payment.providerTradeNo },
          dependencies.config ?? loadZpayConfig(),
        );
        canCancel = result.kind === "unpaid" ||
          (result.kind === "not_found" && !payment.providerTradeNo &&
            payment.status === "failed" && creationState(snapshot) === "failed");
      } catch {
        canCancel = false;
      }
    }
  }
  // Network requests stay outside the transaction. Revalidate under the same
  // order-row lock used by payment creation and successful payment callbacks.
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    if (rows.length !== 1) return "unchanged";
    const current = await tx.order.findUnique({ where: { id: orderId }, include: evidence });
    if (!current || !eligible(current, now)) return "unchanged";
    if (current.orderNo !== snapshot.orderNo || !current.amount.equals(snapshot.amount) ||
        current.paymentMethod !== snapshot.paymentMethod ||
        current.createdAt.getTime() !== snapshot.createdAt.getTime() ||
        current.paymentTransaction?.id !== payment?.id ||
        current.paymentTransaction?.updatedAt.getTime() !== payment?.updatedAt.getTime()) {
      return "held";
    }
    if (!canCancel) {
      // Rotate unresolved orders to the back of the next bounded sweep.
      await tx.order.updateMany({ where: { id: orderId, orderStatus: "pending_payment" }, data: { updatedAt: now } });
      return "held";
    }
    const updated = await tx.order.updateMany({
      where: { id: orderId, orderStatus: "pending_payment", paidAt: null, activatedAt: null },
      data: { orderStatus: "cancelled" },
    });
    if (updated.count !== 1) return "unchanged";
    await tx.adminAuditLog.create({ data: createAdminAuditCreateData({
      action: "order.payment.expired", targetType: "order", targetId: orderId,
      summary: "Unpaid online order cancelled after its ten-minute deadline.",
      metadata: { timeoutMinutes: 10, providerChecked: Boolean(payment), providerClosed: false },
    }) });
    return "cancelled";
  });
}

export async function expireUnpaidOrders(dependencies: Dependencies = {}) {
  const db = dependencies.db ?? prisma;
  const now = dependencies.now?.() ?? new Date();
  const orders = await db.order.findMany({
    where: { orderStatus: "pending_payment", orderType: { in: [...onlineOrderTypes] },
      createdAt: { lte: new Date(now.getTime() - unpaidOrderTimeoutMs) },
      paidAt: null, activatedAt: null, paymentProof: { is: null }, toolPurchase: { is: null },
      seoAuditCredit: { is: null }, seoAuditSubscriptionOrder: { is: null },
      OR: [{ paymentTransaction: { is: null } }, { paymentTransaction: { is: { status: { in: ["pending", "failed"] }, paidAt: null } } }],
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: 50, select: { id: true },
  });
  const result = { cancelled: 0, held: 0, unchanged: 0, failed: 0 };
  const started = Date.now();
  for (const order of orders) {
    if (Date.now() - started >= 45_000) break;
    try {
      result[await expireUnpaidOrder(order.id, { ...dependencies, db, now: () => now })] += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
