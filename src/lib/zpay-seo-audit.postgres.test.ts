import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildZpaySignedParams } from "@/lib/zpay";
import type { ZpayConfig } from "@/lib/zpay-config";
import {
  buildSeoAuditMonitoringOrderCreateData,
  createOrReusePendingSeoAuditOrder,
} from "@/app/online-tools/seo-geo-audit/purchase";
import {
  activateOrderFromZpayNotify,
  ensureZpayPaymentForOrder,
} from "@/lib/zpay-orders";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

const config: ZpayConfig = {
  mode: "live",
  apiBase: "https://zpayz.cn",
  pid: "task6-test-merchant",
  key: "task6_test_secret_32_chars_1234567890",
  defaultType: "wxpay",
  channelId: "task6-channel",
  siteUrl: "https://www.enhe-tech.com.cn",
};

describePostgres("PostgreSQL ZPAY SEO audit payments", () => {
  let db: PrismaClient;
  const userIds: string[] = [];
  const orderIds: string[] = [];

  beforeAll(() => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  });

  afterAll(async () => {
    if (!db) return;
    const bindings = orderIds.length
      ? await db.seoAuditSubscriptionOrder.findMany({
          where: { orderId: { in: orderIds } },
          select: { subscriptionId: true },
        })
      : [];
    const subscriptionIds = [...new Set(bindings.map((binding) => binding.subscriptionId))];
    if (orderIds.length) {
      await db.adminAuditLog.deleteMany({ where: { targetId: { in: orderIds } } });
      await db.seoAuditRun.deleteMany({ where: { sourceOrderId: { in: orderIds } } });
      await db.seoAuditCredit.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.seoAuditSubscriptionOrder.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (subscriptionIds.length) {
      await db.seoAuditSchedule.deleteMany({ where: { subscriptionId: { in: subscriptionIds } } });
      await db.seoAuditSubscription.deleteMany({ where: { id: { in: subscriptionIds } } });
    }
    if (userIds.length) {
      await db.seoAuditProject.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  });

  async function createOrder(
    code: "professional" | "monitoring",
    targetOrigin = "https://example.com",
  ) {
    const offer = await db.seoAuditOffer.findUniqueOrThrow({ where: { code } });
    const user = await db.user.create({
      data: {
        email: `task6-zpay-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const order = await db.order.create({
      data: {
        orderNo: `TASK6-ZPAY-${randomUUID()}`,
        userId: user.id,
        orderType: code === "monitoring" ? "seo_audit_monitoring" : "seo_audit_credit",
        seoAuditOfferId: offer.id,
        seoAuditTargetOrigin: targetOrigin,
        amount: offer.regularPrice,
        paymentMethod: "wechat",
        orderStatus: "pending_payment",
        isTestData: true,
      },
    });
    orderIds.push(order.id);
    return { offer, user, order };
  }

  function signedCallback(order: { id: string; orderNo: string; amount: { toString(): string } }) {
    return buildZpaySignedParams(
      {
        pid: config.pid,
        name: "SEO/GEO audit",
        money: Number(order.amount.toString()).toFixed(2),
        out_trade_no: order.orderNo,
        trade_no: `provider-${randomUUID()}`,
        param: order.id,
        trade_status: "TRADE_SUCCESS",
        type: "wxpay",
      },
      config.key,
    );
  }

  it.each(["professional", "monitoring"] as const)(
    "creates a ZPAY transaction and atomically grants the %s entitlement on callback",
    async (code) => {
      const fixture = await createOrder(code);
      const requestPayment = vi.fn().mockResolvedValue({
        code: 1,
        msg: "success",
        trade_no: `created-${randomUUID()}`,
        qrcode: "https://pay.example.test/qrcode",
      });

      const payment = await ensureZpayPaymentForOrder(
        { orderId: fixture.order.id, userId: fixture.user.id, clientIp: "203.0.113.10" },
        { db, config, requestPayment },
      );
      expect(payment.transaction.status).toBe("pending");
      expect(requestPayment).toHaveBeenCalledTimes(1);
      expect(String(requestPayment.mock.calls[0]?.[0]?.params?.name)).toContain(
        fixture.offer.name,
      );

      const payload = signedCallback(fixture.order);
      await expect(
        activateOrderFromZpayNotify(payload, {
          db,
          config,
          now: () => new Date("2026-07-25T03:00:00.000Z"),
        }),
      ).resolves.toEqual({ ok: true, response: "success", status: 200 });

      const [order, transaction] = await Promise.all([
        db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
        db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
      ]);
      expect(order.orderStatus).toBe("activated");
      expect(transaction.status).toBe("paid");
      expect(transaction.amount.equals(fixture.order.amount)).toBe(true);
      expect(transaction.notifyPayload).toMatchObject({
        pid: config.pid,
        out_trade_no: fixture.order.orderNo,
        trade_status: "TRADE_SUCCESS",
      });
      expect(JSON.stringify(transaction.notifyPayload)).not.toContain("sign");

      if (code === "professional") {
        const credit = await db.seoAuditCredit.findUniqueOrThrow({
          where: { orderId: fixture.order.id },
        });
        expect(credit).toMatchObject({
          totalRuns: fixture.offer.includedRuns,
          remainingRuns: fixture.offer.includedRuns,
          pageLimit: fixture.offer.pageLimit,
        });
      } else {
        const binding = await db.seoAuditSubscriptionOrder.findUniqueOrThrow({
          where: { orderId: fixture.order.id },
          include: { subscription: { include: { schedule: true } } },
        });
        expect(binding).toMatchObject({
          scheduledRunsGranted: fixture.offer.maxScheduledRuns,
          manualRunsGranted: fixture.offer.manualRuns,
        });
        expect(binding.subscription.schedule).toMatchObject({
          cadence: "weekly",
          weekday: 1,
          hour: 9,
          minute: 0,
          timeZone: "Asia/Shanghai",
          enabled: true,
        });
      }

      await activateOrderFromZpayNotify(payload, { db, config });
      expect(
        await db.seoAuditCredit.count({ where: { orderId: fixture.order.id } }),
      ).toBe(code === "professional" ? 1 : 0);
      expect(
        await db.seoAuditSubscriptionOrder.count({ where: { orderId: fixture.order.id } }),
      ).toBe(code === "monitoring" ? 1 : 0);
    },
    30_000,
  );

  it("rolls back payment and order activation when monitoring entitlement creation fails", async () => {
    const fixture = await createOrder("monitoring", "http://127.0.0.1");
    const payload = signedCallback(fixture.order);

    await expect(
      activateOrderFromZpayNotify(payload, { db, config }),
    ).rejects.toThrow("INVALID_TARGET");

    const [order, transaction, binding] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.paymentTransaction.findUnique({ where: { orderId: fixture.order.id } }),
      db.seoAuditSubscriptionOrder.findUnique({ where: { orderId: fixture.order.id } }),
    ]);
    expect(order.orderStatus).toBe("pending_payment");
    expect(transaction).toBeNull();
    expect(binding).toBeNull();
  });

  it("serializes concurrent monitoring checkout clicks into one pending order", async () => {
    const offer = await db.seoAuditOffer.findUniqueOrThrow({
      where: { code: "monitoring" },
    });
    const user = await db.user.create({
      data: {
        email: `task6-checkout-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const buildData = (orderNo: string) =>
      buildSeoAuditMonitoringOrderCreateData({
        orderNo,
        userId: user.id,
        source: {
          normalizedOrigin: "https://checkout-idempotency.example",
          sourceRunId: null,
        },
        offer: {
          id: offer.id,
          orderType: "seo_audit_monitoring",
          price: offer.regularPrice.toFixed(2),
        },
        paymentMethod: "wechat",
      });

    const [first, second] = await Promise.all([
      createOrReusePendingSeoAuditOrder(buildData(`TASK6-CHECKOUT-${randomUUID()}`), {
        db,
      }),
      createOrReusePendingSeoAuditOrder(buildData(`TASK6-CHECKOUT-${randomUUID()}`), {
        db,
      }),
    ]);
    orderIds.push(first.id);

    expect(first.id).toBe(second.id);
    expect([first.reused, second.reused].sort()).toEqual([false, true]);
    await expect(
      db.order.count({
        where: {
          userId: user.id,
          seoAuditOfferId: offer.id,
          seoAuditTargetOrigin: "https://checkout-idempotency.example",
          orderType: "seo_audit_monitoring",
          paymentMethod: "wechat",
          orderStatus: "pending_payment",
        },
      }),
    ).resolves.toBe(1);
  });
});
