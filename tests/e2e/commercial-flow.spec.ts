import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const userEmail = `e2e-paid-${suffix}@enhe.test`;
const password = "E2ePass123!";
const softwareSlug = `e2e-paid-software-${suffix}`;

let userId = "";
let categoryId = "";
let softwareToolId = "";
let downloadFileId = "";
let downloadFilePath = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (process.env.ZPAY_MODE?.trim() !== "disabled") {
    throw new Error(
      "This spec requires explicit ZPAY_MODE=disabled to prevent real payment requests.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash,
      nickname: "E2E paid software user",
      isTestData: true,
    },
  });
  userId = user.id;

  const category = await prisma.toolCategory.create({
    data: {
      name: `E2E paid software ${suffix}`,
      type: "software",
      status: "active",
      sortOrder: -100,
    },
  });
  categoryId = category.id;

  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const downloadFileName = `e2e-download-${suffix}.txt`;
  downloadFilePath = join(uploadDir, downloadFileName);
  await writeFile(downloadFilePath, "e2e download");

  const file = await prisma.file.create({
    data: {
      fileName: downloadFileName,
      filePath: downloadFilePath,
      fileUrl: `/uploads/${downloadFileName}`,
      fileSize: BigInt(12),
      mimeType: "text/plain",
    },
  });
  downloadFileId = file.id;

  const software = await prisma.tool.create({
    data: {
      name: `E2E Paid Software ${suffix}`,
      englishName: `E2E Paid Software ${suffix}`,
      slug: softwareSlug,
      type: "software",
      categoryId,
      shortDescription: "E2E paid software purchase check",
      content: "E2E paid software purchase and delivery check",
      isVipRequired: false,
      isDownloadPaid: true,
      downloadPrice: "1.00",
      downloadFileId,
      status: "published",
      sortOrder: -100,
    },
  });
  softwareToolId = software.id;
});

test.afterAll(async () => {
  try {
    const orders = userId
      ? await prisma.order.findMany({
          where: { userId },
          select: { id: true },
        })
      : [];
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length) {
      await prisma.adminAuditLog.deleteMany({
        where: { targetId: { in: orderIds } },
      });
      await prisma.paymentTransaction.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.paymentProof.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderRefundRecord.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.toolPurchase.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    if (userId) {
      await prisma.analyticsEvent.deleteMany({ where: { userId } });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.loginAttempt.deleteMany({
        where: { identifier: userEmail },
      });
    }
    if (softwareToolId) {
      await prisma.downloadLog.deleteMany({
        where: { toolId: softwareToolId },
      });
      await prisma.toolUsageLog.deleteMany({
        where: { toolId: softwareToolId },
      });
      await prisma.tool.update({
        where: { id: softwareToolId },
        data: { downloadFileId: null, categoryId: null },
      });
      await prisma.tool.delete({ where: { id: softwareToolId } });
    }
    if (downloadFileId) {
      await prisma.file.deleteMany({ where: { id: downloadFileId } });
    }
    if (categoryId) {
      await prisma.toolCategory.deleteMany({ where: { id: categoryId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  } finally {
    await prisma.$disconnect();
    if (downloadFilePath) await rm(downloadFilePath, { force: true });
  }
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(userEmail);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/user(?:[/?#]|$)/, { timeout: 15_000 });
}

test("a pending paid software order reaches disabled ZPAY", async ({
  page,
}) => {
  await page.route("**/api/analytics", (route) =>
    route.fulfill({ status: 204 }),
  );
  await login(page);

  const order = await prisma.order.create({
    data: {
      orderNo: `E2E-SOFTWARE-PENDING-${suffix}`,
      userId,
      toolId: softwareToolId,
      orderType: "software_download",
      amount: "1.00",
      paymentMethod: "wechat",
      orderStatus: "pending_payment",
      isTestData: true,
    },
  });
  const payResponse = await page.goto(`/orders/${order.id}/pay`);

  expect(payResponse?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/orders\/[A-Za-z0-9_-]+\/pay$/);
  await expect(
    page.getByText("ZPAY_PAYMENT_DISABLED", { exact: true }),
  ).toBeVisible();

  expect(order.orderType).toBe("software_download");
  expect(order.orderStatus).toBe("pending_payment");
  expect(order.amount.toString()).toBe("1");
});

test("paid software stays locked until a purchase is activated", async ({
  page,
}) => {
  await login(page);

  await page.goto(`/api/tools/${softwareToolId}/download`);
  await expect(page).toHaveURL(
    new RegExp(`/software/${softwareSlug}\\?download=pay-required$`),
  );

  const order = await prisma.order.create({
    data: {
      orderNo: `E2E-SOFTWARE-${suffix}`,
      userId,
      toolId: softwareToolId,
      orderType: "software_download",
      amount: "1.00",
      paymentMethod: "wechat",
      orderStatus: "activated",
      paidAt: new Date(),
      activatedAt: new Date(),
      isTestData: true,
    },
  });
  await prisma.toolPurchase.create({
    data: {
      userId,
      toolId: softwareToolId,
      orderId: order.id,
      amount: "1.00",
    },
  });

  await page.goto(`/api/tools/${softwareToolId}/download`);
  await expect(page).toHaveURL(
    new RegExp(`/uploads/e2e-download-${suffix}\\.txt$`),
  );
});
