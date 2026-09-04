const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function calculateEndTime(durationDays, startTime) {
  if (durationDays <= 0) return null;
  const endTime = new Date(startTime);
  endTime.setDate(endTime.getDate() + durationDays);
  return endTime;
}

async function hasActiveMembership(userId, now) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ isLifetime: true }, { endTime: { gt: now } }]
    },
    select: { id: true }
  });
  return Boolean(membership);
}

async function main() {
  const orderNo = getArgValue("order-no");
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const orders = await prisma.order.findMany({
    where: {
      orderType: "vip",
      orderStatus: "activated",
      ...(orderNo ? { orderNo } : {})
    },
    include: { plan: true },
    orderBy: [{ activatedAt: "desc" }, { paidAt: "desc" }, { createdAt: "desc" }]
  });
  let repaired = 0;
  let skipped = 0;

  for (const order of orders) {
    if (!order.planId || !order.plan) {
      skipped += 1;
      console.log(`[skip] ${order.orderNo}: missing VIP plan binding`);
      continue;
    }

    if (await hasActiveMembership(order.userId, now)) {
      skipped += 1;
      console.log(`[skip] ${order.orderNo}: user already has an active membership`);
      continue;
    }

    const startTime = order.activatedAt ?? order.paidAt ?? order.createdAt;
    const endTime = calculateEndTime(order.plan.durationDays, startTime);
    const isLifetime = order.plan.durationDays <= 0;

    if (!isLifetime && (!endTime || endTime <= now)) {
      skipped += 1;
      console.log(`[skip] ${order.orderNo}: activated VIP period has expired`);
      continue;
    }

    console.log(
      `[repair] ${order.orderNo}: ${order.plan.name}, user=${order.userId}, start=${startTime.toISOString()}, end=${
        endTime ? endTime.toISOString() : "lifetime"
      }`
    );

    if (!dryRun) {
      await prisma.membership.create({
        data: {
          userId: order.userId,
          planId: order.planId,
          vipType: order.plan.name,
          startTime,
          endTime,
          isLifetime,
          status: "active"
        }
      });
      await prisma.paymentProof.updateMany({
        where: { orderId: order.id },
        data: { reviewStatus: "approved" }
      });
    }

    repaired += 1;
  }

  console.log(`${dryRun ? "Dry run" : "Repair"} complete: repaired=${repaired}, skipped=${skipped}, scanned=${orders.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
