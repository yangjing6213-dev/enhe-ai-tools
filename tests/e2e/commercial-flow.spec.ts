import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const userEmail = `e2e-user-${suffix}@enhe.test`;
const adminEmail = `e2e-admin-${suffix}@enhe.test`;
const password = "E2ePass123!";

let userId = "";
let adminId = "";
let planId = "";
let softwareCategoryId = "";
let onlineCategoryId = "";
let softwareToolId = "";
let onlineToolId = "";
let downloadFileId = "";
let uploadProofPath = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  const [user, admin] = await Promise.all([
    prisma.user.create({
      data: { email: userEmail, passwordHash, nickname: "E2E 用户" }
    }),
    prisma.user.create({
      data: { email: adminEmail, passwordHash, nickname: "E2E 管理员", role: "admin" }
    })
  ]);
  userId = user.id;
  adminId = admin.id;

  const plan = await prisma.vipPlan.create({
    data: {
      name: `E2E 7天VIP ${suffix}`,
      durationDays: 7,
      price: "1.00",
      originalPrice: "9.00",
      description: "E2E 测试套餐",
      status: "active",
      sortOrder: -100
    }
  });
  planId = plan.id;

  const category = await prisma.toolCategory.create({
    data: { name: `E2E 分类 ${suffix}`, type: "software", status: "active", sortOrder: -100 }
  });
  softwareCategoryId = category.id;
  const onlineCategory = await prisma.toolCategory.create({
    data: { name: `E2E 在线分类 ${suffix}`, type: "online", status: "active", sortOrder: -99 }
  });
  onlineCategoryId = onlineCategory.id;

  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const downloadFileName = `e2e-download-${suffix}.txt`;
  await writeFile(join(uploadDir, downloadFileName), "e2e download");

  const file = await prisma.file.create({
    data: {
      fileName: downloadFileName,
      filePath: join(uploadDir, downloadFileName),
      fileUrl: `/uploads/${downloadFileName}`,
      fileSize: BigInt(12),
      mimeType: "text/plain"
    }
  });
  downloadFileId = file.id;

  const software = await prisma.tool.create({
    data: {
      name: `E2E VIP 软件 ${suffix}`,
      slug: `e2e-vip-software-${suffix}`,
      type: "software",
      categoryId: category.id,
      shortDescription: "E2E VIP 下载拦截",
      content: "E2E VIP 下载拦截",
      isVipRequired: true,
      isDownloadPaid: false,
      downloadFileId: file.id,
      status: "published",
      sortOrder: -100
    }
  });
  softwareToolId = software.id;

  const online = await prisma.tool.create({
    data: {
      name: `E2E VIP 在线工具 ${suffix}`,
      slug: `e2e-vip-online-${suffix}`,
      type: "online",
      categoryId: onlineCategory.id,
      shortDescription: "E2E 在线工具拦截",
      content: "E2E 在线工具拦截",
      onlineUrl: "/legal/user-agreement",
      isVipRequired: true,
      status: "published",
      sortOrder: -99
    }
  });
  onlineToolId = online.id;

  const proofDir = join(process.cwd(), "test-results", "e2e");
  uploadProofPath = join(proofDir, `proof-${suffix}.png`);
  await mkdir(proofDir, { recursive: true });
  await writeFile(uploadProofPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"));
});

test.afterAll(async () => {
  const userIds = [userId, adminId].filter(Boolean);
  const toolIds = [softwareToolId, onlineToolId].filter(Boolean);
  const categoryIds = [softwareCategoryId, onlineCategoryId].filter(Boolean);

  await prisma.downloadLog.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.toolUsageLog.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.comment.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.tutorial.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.toolFaq.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.toolChangelog.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.toolTagLink.deleteMany({ where: { toolId: { in: toolIds } } });
  await prisma.paymentProof.deleteMany({ where: { userId: { in: [userId, adminId].filter(Boolean) } } });
  await prisma.toolPurchase.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.membership.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.loginAttempt.deleteMany({ where: { identifier: { in: [userEmail, adminEmail] } } });
  await prisma.tool.updateMany({ where: { id: { in: toolIds } }, data: { downloadFileId: null, categoryId: null } });
  await prisma.tool.deleteMany({ where: { id: { in: toolIds } } });
  await prisma.file.deleteMany({ where: { id: downloadFileId || "__none__" } });
  await prisma.toolCategory.deleteMany({ where: { id: { in: categoryIds } } });
  await prisma.vipPlan.deleteMany({ where: { id: planId || "__none__" } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /登录|Log in|Login/i }).click();
}

test("user uploads a VIP order proof and admin approval activates membership", async ({ page }) => {
  await login(page, userEmail);
  await expect(page).toHaveURL(/\/user/);

  await page.goto("/pricing");
  const planCard = page.locator("form").filter({ hasText: `E2E 7天VIP ${suffix}` });
  await planCard.getByRole("button").click();
  await expect(page).toHaveURL(/\/orders\/.+\/pay/);

  await page.locator('input[name="file"]').setInputFiles(uploadProofPath);
  await page.getByRole("button", { name: /上传并提交审核/ }).click();
  await expect(page).toHaveURL(/\/orders\/.+uploaded=1/);
  await expect(page.getByText("上传成功，订单已进入待审核状态。")).toBeVisible();

  const order = await prisma.order.findFirstOrThrow({
    where: { userId, planId },
    orderBy: { createdAt: "desc" }
  });
  expect(order.orderStatus).toBe("pending_review");

  await page.goto("/user");
  await page.getByRole("button", { name: /退出|Logout/i }).click();
  await login(page, adminEmail);
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/payments");
  const proofRow = page.getByRole("link", { name: order.orderNo }).locator("xpath=..");
  await proofRow.locator('a[href^="/admin/payments/"]').click();
  await expect(page).toHaveURL(/\/admin\/payments\/.+/);
  await page.locator('button[name="decision"][value="approved"]').click();

  await expect.poll(async () => {
    const refreshed = await prisma.order.findUnique({ where: { id: order.id } });
    return refreshed?.orderStatus;
  }).toBe("activated");

  await expect.poll(async () => {
    const membership = await prisma.membership.findFirst({ where: { userId, status: "active" } });
    return Boolean(membership);
  }).toBe(true);
});

test("VIP gates block ordinary users and allow active VIP users", async ({ page }) => {
  await login(page, userEmail);
  await expect(page).toHaveURL(/\/user/);

  await prisma.membership.deleteMany({ where: { userId } });
  await page.goto(`/api/tools/${softwareToolId}/download`);
  await expect(page).toHaveURL(/\/pricing/);

  await page.goto(`/api/tools/${onlineToolId}/use`);
  await expect(page).toHaveURL(/\/pricing/);

  await prisma.membership.create({
    data: {
      userId,
      planId,
      vipType: "E2E VIP",
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "active"
    }
  });

  await page.goto(`/api/tools/${softwareToolId}/download`);
  await expect(page).toHaveURL(new RegExp(`/uploads/e2e-download-${suffix}\\.txt`));

  await page.goto(`/api/tools/${onlineToolId}/use`);
  await expect(page).toHaveURL(/\/legal\/user-agreement/);
});
