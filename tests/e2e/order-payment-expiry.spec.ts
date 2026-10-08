import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { createSessionToken, hashSessionToken, signSessionCookieValue } from "../../src/lib/auth-security";

const enabled = Boolean(process.env.DATABASE_URL);
test.skip(!enabled, "Requires a dedicated local test database.");
const prisma = new PrismaClient();
let userId = "";
let cookie = "";
const orderIds: string[] = [];

test.beforeAll(async () => {
  if (!enabled) return;
  const url = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !url.pathname.includes("test") || process.env.ZPAY_MODE !== "disabled") {
    throw new Error("Expiry browser checks require local test data and disabled real payments.");
  }
  const user = await prisma.user.create({ data: { email: `expiry-${randomUUID()}@example.test`, passwordHash: "test-only", isTestData: true } });
  userId = user.id;
  const token = createSessionToken();
  const session = await prisma.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3600_000) } });
  cookie = signSessionCookieValue(session.id, token, process.env.AUTH_SECRET!);
});

test.afterAll(async () => {
  if (orderIds.length) {
    await prisma.adminAuditLog.deleteMany({ where: { targetId: { in: orderIds } } });
    await prisma.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  if (userId) {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

test("expired payment page cancels the unpaid order and removes the payment entry", async ({ page, context, baseURL }, testInfo) => {
  const order = await prisma.order.create({ data: { userId, orderNo: `EXPIRY-${randomUUID()}`, amount: "1.00", orderType: "seo_audit_credit", seoAuditOfferId: "seo-audit-professional", paymentMethod: "alipay", createdAt: new Date(Date.now() - 601_000), isTestData: true } });
  orderIds.push(order.id);
  await context.addCookies([{ name: "enhe_session", value: cookie, url: baseURL!, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`/orders/${order.id}/pay`);
  await expect(page.getByRole("heading", { name: "订单已取消", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开支付宝收银台" })).toHaveCount(0);
  await expect(page.getByText("请勿使用之前保存的二维码付款", { exact: false })).toBeVisible();
  await expect(page.locator(".surface-panel").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).orderStatus).toBe("cancelled");
  const status = await page.request.get(`/api/orders/${order.id}/payment-status`);
  expect(await status.json()).toMatchObject({ orderStatus: "cancelled", unlocked: false });
  await page.screenshot({ path: testInfo.outputPath("expired-order.png"), fullPage: true });
});

test("a cancelled order with a late payment clearly says payment was recorded", async ({ page, context, baseURL }) => {
  const order = await prisma.order.create({ data: { userId, orderNo: `LATE-${randomUUID()}`, amount: "1.00", orderType: "seo_audit_credit", seoAuditOfferId: "seo-audit-professional", paymentMethod: "alipay", orderStatus: "cancelled", isTestData: true, paymentTransaction: { create: { provider: "zpay", paymentType: "alipay", status: "paid", amount: "1.00", paidAt: new Date() } } } });
  orderIds.push(order.id);
  await context.addCookies([{ name: "enhe_session", value: cookie, url: baseURL!, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`/orders/${order.id}/pay`);
  await expect(page.getByRole("heading", { name: "已收到付款，需要核对", exact: true })).toBeVisible();
  await expect(page.getByText("款项已记录，请勿再次支付", { exact: false })).toBeVisible();
  expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).orderStatus).toBe("cancelled");
  const status = await page.request.get(`/api/orders/${order.id}/payment-status`);
  expect(await status.json()).toMatchObject({ orderStatus: "cancelled", paymentStatus: "paid", unlocked: false });
});
