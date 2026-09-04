import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { toolPurchase: true, paymentTransaction: true }
  });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  const unlocked = order.orderStatus === "activated" || order.orderStatus === "paid" || Boolean(order.toolPurchase);
  return NextResponse.json({
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentTransaction?.status ?? null,
    unlocked
  });
}
