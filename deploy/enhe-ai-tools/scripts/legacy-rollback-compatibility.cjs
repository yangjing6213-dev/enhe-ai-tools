const { createRequire } = require("node:module");

const requireFromApp = createRequire("/app/package.json");
const { PrismaClient } = requireFromApp("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  await prisma.user.findFirst({
    select: { id: true, email: true, role: true, status: true, createdAt: true },
  });
  await prisma.tool.findFirst({
    select: {
      id: true,
      slug: true,
      status: true,
      isVipRequired: true,
      isDownloadPaid: true,
      downloadPrice: true,
    },
  });
  await prisma.order.findFirst({
    select: {
      id: true,
      orderNo: true,
      userId: true,
      toolId: true,
      orderType: true,
      amount: true,
      paymentMethod: true,
      orderStatus: true,
      paidAt: true,
    },
  });
  await prisma.paymentTransaction.findFirst({
    select: {
      id: true,
      orderId: true,
      provider: true,
      providerTradeNo: true,
      paymentType: true,
      status: true,
      amount: true,
      paidAt: true,
    },
  });
  await prisma.paymentProof.findFirst({
    select: {
      id: true,
      orderId: true,
      userId: true,
      paymentMethod: true,
      reviewStatus: true,
      createdAt: true,
    },
  });
  await prisma.toolPurchase.findFirst({
    select: {
      id: true,
      userId: true,
      toolId: true,
      orderId: true,
      amount: true,
      createdAt: true,
    },
  });
  await prisma.adminAuditLog.findFirst({
    select: {
      id: true,
      adminId: true,
      action: true,
      targetType: true,
      targetId: true,
      createdAt: true,
    },
  });
}

main()
  .then(() => {
    console.log("Legacy Prisma order, payment, purchase, and admin probes passed.");
  })
  .catch((error) => {
    console.error("Legacy Prisma compatibility probe failed.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
