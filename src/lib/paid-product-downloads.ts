import type { Order, OrderStatus, Prisma } from "@prisma/client";

/** Caller must hold the order row lock and save the payment in this transaction. */
export async function countFirstPaidProductDownload(
  tx: Pick<Prisma.TransactionClient, "tool">,
  previousOrder: Pick<Order, "orderType" | "toolId" | "orderStatus" | "paidAt" | "amount" | "isTestData">,
  nextStatus: OrderStatus,
) {
  if (
    previousOrder.orderType !== "software_download" ||
    !previousOrder.toolId || previousOrder.isTestData ||
    !(Number(previousOrder.amount) > 0) ||
    previousOrder.paidAt ||
    !["pending_payment", "pending_review", "rejected", "cancelled"].includes(previousOrder.orderStatus) ||
    (nextStatus !== "paid" && nextStatus !== "activated")
  ) return;

  // paidAt persists even if an admin later reopens the order. Do not backfill old orders.
  await tx.tool.update({
    where: { id: previousOrder.toolId },
    data: { downloadCount: { increment: 1 } },
  });
}
