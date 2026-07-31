import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const suffix = randomUUID();
const password = "SeoAuditE2e123!";
const userEmail = `seo-audit-${suffix}@enhe.test`;
const targetOrigin = `https://seo-audit-${suffix}.example.test`;
const targetUrl = `${targetOrigin}/catalog?source=e2e`;

let userId = "";
let sourceRunId = "";
let professionalOfferId = "";
let professionalOfferName = "";
let professionalPrices: number[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (process.env.ZPAY_MODE?.trim() !== "disabled") {
    throw new Error(
      "This spec requires explicit ZPAY_MODE=disabled to prevent real payment requests.",
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL;
  if (!siteUrl || !/^https?:\/\/[^/]+\/?$/i.test(siteUrl.trim())) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_APP_URL/APP_URL) to the local test origin.",
    );
  }

  const [freeOffer, professionalOffer] = await Promise.all([
    prisma.seoAuditOffer.findUnique({ where: { code: "free" } }),
    prisma.seoAuditOffer.findUnique({ where: { code: "professional" } }),
  ]);
  if (!freeOffer || freeOffer.status !== "active") {
    throw new Error("The seeded free SEO audit offer is unavailable.");
  }
  if (
    !professionalOffer ||
    professionalOffer.status !== "active" ||
    professionalOffer.orderType !== "seo_audit_credit" ||
    professionalOffer.regularPrice.lessThanOrEqualTo(0) ||
    !professionalOffer.includedRuns ||
    professionalOffer.includedRuns < 1 ||
    professionalOffer.pageLimit < 1 ||
    professionalOffer.validityDays < 1
  ) {
    throw new Error("The seeded professional SEO audit offer is not purchasable.");
  }
  professionalOfferId = professionalOffer.id;
  professionalOfferName = professionalOffer.name;
  professionalPrices = [
    Number(professionalOffer.regularPrice.toString()),
    ...(professionalOffer.launchPrice
      ? [Number(professionalOffer.launchPrice.toString())]
      : []),
  ];

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash,
      nickname: "SEO audit commercial E2E",
      isTestData: true,
    },
  });
  userId = user.id;

  const sourceRun = await prisma.seoAuditRun.create({
    data: {
      userId,
      offerId: freeOffer.id,
      status: "completed",
      kind: "free",
      targetUrl,
      normalizedOrigin: targetOrigin,
      pageLimit: freeOffer.pageLimit,
      totalTimeoutSeconds: 60,
      summaryScore: 78,
      summaryEvidenceCoverage: 80,
      summaryPageCount: 10,
      summaryCriticalCount: 0,
      summaryHighCount: 1,
      summaryMediumCount: 0,
      summaryFindings: [
        {
          id: "F001",
          code: "missing_meta_description",
          severity: "high",
          issue: "Some pages are missing meta descriptions.",
        },
      ],
      completedAt: new Date(),
    },
  });
  sourceRunId = sourceRun.id;
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
      await prisma.seoAuditRun.deleteMany({
        where: { sourceOrderId: { in: orderIds } },
      });
      await prisma.seoAuditCredit.deleteMany({
        where: { orderId: { in: orderIds } },
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
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    if (sourceRunId) {
      await prisma.seoAuditArtifactUpload.deleteMany({
        where: { runId: sourceRunId },
      });
      await prisma.seoAuditRun.deleteMany({ where: { id: sourceRunId } });
    }
    if (userId) {
      await prisma.analyticsEvent.deleteMany({
        where: {
          OR: [
            { userId },
            {
              entityId: {
                in: [...orderIds, sourceRunId].filter(Boolean),
              },
            },
          ],
        },
      });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.loginAttempt.deleteMany({
        where: { identifier: userEmail },
      });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(userEmail);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/user(?:[/?#]|$)/, { timeout: 15_000 });
}

test("creates a professional SEO audit order and reaches disabled payment", async ({
  page,
}) => {
  await page.route("**/api/analytics", (route) =>
    route.fulfill({ status: 204 }),
  );

  const publicResponse = await page.goto("/online-tools/seo-geo-audit");
  expect(publicResponse?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "独立站 SEO/GEO 智能巡检",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("公开网站 URL")).toBeVisible();

  await login(page);
  await page.goto(`/online-tools/seo-geo-audit?run=${sourceRunId}`);
  await expect(page.getByText("免费巡检已完成", { exact: true })).toBeVisible();
  await expect(page.getByText(targetOrigin, { exact: true })).toBeVisible();

  const professionalForm = page.locator("form").filter({
    has: page.locator(
      'input[name="offerCode"][value="professional"]',
    ),
  });
  await expect(professionalForm).toHaveCount(1);
  await expect(professionalForm).toContainText(professionalOfferName);
  await professionalForm
    .getByRole("button", { name: "继续支付", exact: true })
    .click();

  await expect(page).toHaveURL(/\/orders\/[A-Za-z0-9_-]+\/pay$/, {
    timeout: 15_000,
  });
  const orderId = new URL(page.url()).pathname.split("/")[2];
  expect(orderId).toBeTruthy();

  await expect(
    page.getByRole("heading", { name: "订单支付", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "支付订单创建失败",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("ZPAY_PAYMENT_DISABLED", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开收银台" })).toHaveCount(0);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      seoAuditOffer: true,
      paymentTransaction: true,
    },
  });
  expect(order).toMatchObject({
    userId,
    seoAuditOfferId: professionalOfferId,
    seoAuditTargetOrigin: targetOrigin,
    seoAuditSourceRunId: sourceRunId,
    orderType: "seo_audit_credit",
    paymentMethod: "alipay",
    orderStatus: "pending_payment",
    seoAuditOffer: {
      id: professionalOfferId,
      code: "professional",
      status: "active",
    },
    paymentTransaction: null,
  });
  expect(professionalPrices).toContain(Number(order.amount.toString()));
});
