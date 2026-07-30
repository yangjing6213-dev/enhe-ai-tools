import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revokeEntitlementsForRefundedOrder } from "@/lib/membership";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsedDatabaseUrl = new URL(databaseUrl);
  const safeHosts = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal", "postgres"]);
  const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, "").toLowerCase();
  if (!safeHosts.has(parsedDatabaseUrl.hostname) || !/(test|task6|codex)/.test(databaseName)) {
    throw new Error("SEO_AUDIT_TEST_DATABASE_URL must target an explicit local test database.");
  }
}
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres("PostgreSQL SEO audit monitoring refund isolation", () => {
  let db: PrismaClient;
  const userIds: string[] = [];
  const projectIds: string[] = [];
  const subscriptionIds: string[] = [];
  const orderIds: string[] = [];

  beforeAll(() => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
  });

  afterAll(async () => {
    if (!db) return;
    if (subscriptionIds.length) {
      await db.seoAuditSchedule.deleteMany({
        where: { subscriptionId: { in: subscriptionIds } },
      });
      await db.seoAuditSubscriptionOrder.deleteMany({
        where: { subscriptionId: { in: subscriptionIds } },
      });
    }
    if (orderIds.length) {
      await db.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (subscriptionIds.length) {
      await db.seoAuditSubscription.deleteMany({
        where: { id: { in: subscriptionIds } },
      });
    }
    if (projectIds.length) {
      await db.seoAuditProject.deleteMany({ where: { id: { in: projectIds } } });
    }
    if (userIds.length) {
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  });

  async function createMonitoringRenewalFixture() {
    const offer = await db.seoAuditOffer.findUniqueOrThrow({
      where: { code: "monitoring" },
    });
    if (offer.maxScheduledRuns === null || offer.manualRuns === null) {
      throw new Error("Monitoring offer is missing renewal quota configuration.");
    }

    const user = await db.user.create({
      data: {
        email: `task6-monitoring-refund-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);

    const origin = `https://task6-${randomUUID()}.example.test`;
    const project = await db.seoAuditProject.create({
      data: {
        userId: user.id,
        normalizedOrigin: origin,
        displayUrl: origin,
      },
      select: { id: true },
    });
    projectIds.push(project.id);

    const serviceWindows = [
      {
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-01-31T00:00:00.000Z"),
      },
      {
        startsAt: new Date("2026-01-31T00:00:00.000Z"),
        endsAt: new Date("2026-03-02T00:00:00.000Z"),
      },
      {
        startsAt: new Date("2026-03-02T00:00:00.000Z"),
        endsAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ];
    const subscription = await db.seoAuditSubscription.create({
      data: {
        userId: user.id,
        projectId: project.id,
        offerId: offer.id,
        status: "active",
        startsAt: serviceWindows[0].startsAt,
        expiresAt: serviceWindows[2].endsAt,
        maxScheduledRuns: offer.maxScheduledRuns * serviceWindows.length,
        scheduledRunsUsed: 0,
        manualRunsRemaining: offer.manualRuns * serviceWindows.length,
      },
      select: { id: true },
    });
    subscriptionIds.push(subscription.id);

    const nextRunAt = new Date("2026-01-08T01:00:00.000Z");
    await db.seoAuditSchedule.create({
      data: {
        subscriptionId: subscription.id,
        enabled: true,
        nextRunAt,
      },
    });

    const orders = [];
    for (const [index, serviceWindow] of serviceWindows.entries()) {
      const order = await db.order.create({
        data: {
          orderNo: `TASK6-MONITORING-${randomUUID()}`,
          userId: user.id,
          orderType: "seo_audit_monitoring",
          seoAuditOfferId: offer.id,
          seoAuditTargetOrigin: origin,
          amount: offer.regularPrice,
          paymentMethod: "wechat",
          orderStatus: "activated",
          paidAt: serviceWindow.startsAt,
          activatedAt: serviceWindow.startsAt,
          isTestData: true,
        },
      });
      orderIds.push(order.id);
      orders.push(order);

      await db.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: "zpay",
          providerTradeNo: `task6-provider-${index}-${randomUUID()}`,
          paymentType: "wxpay",
          status: "paid",
          amount: order.amount,
          paidAt: order.paidAt,
        },
      });
      await db.seoAuditSubscriptionOrder.create({
        data: {
          subscriptionId: subscription.id,
          orderId: order.id,
          serviceStartsAt: serviceWindow.startsAt,
          serviceEndsAt: serviceWindow.endsAt,
          scheduledRunsGranted: offer.maxScheduledRuns,
          manualRunsGranted: offer.manualRuns,
        },
      });
    }

    return {
      offer: {
        ...offer,
        maxScheduledRuns: offer.maxScheduledRuns,
        manualRuns: offer.manualRuns,
      },
      user,
      serviceWindows,
      subscription,
      nextRunAt,
      orders,
    };
  }

  it("revokes only the refunded renewal quota and preserves other paid renewals", async () => {
    const { offer, user, serviceWindows, subscription, nextRunAt, orders } =
      await createMonitoringRenewalFixture();
    const refundedOrder = orders[1];
    const survivingOrderIds = [orders[0].id, orders[2].id];
    const refundedAt = new Date("2026-02-10T00:00:00.000Z");
    await db.$transaction((tx) =>
      revokeEntitlementsForRefundedOrder(
        tx,
        {
          id: refundedOrder.id,
          userId: user.id,
          orderType: "seo_audit_monitoring",
        },
        refundedAt,
      ),
    );

    const [updatedSubscription, updatedSchedule, bindings, survivingOrders, survivingPayments] =
      await Promise.all([
        db.seoAuditSubscription.findUniqueOrThrow({ where: { id: subscription.id } }),
        db.seoAuditSchedule.findUniqueOrThrow({
          where: { subscriptionId: subscription.id },
        }),
        db.seoAuditSubscriptionOrder.findMany({
          where: { subscriptionId: subscription.id },
          orderBy: { serviceStartsAt: "asc" },
        }),
        db.order.findMany({
          where: { id: { in: survivingOrderIds } },
          orderBy: { paidAt: "asc" },
        }),
        db.paymentTransaction.findMany({
          where: { orderId: { in: survivingOrderIds } },
          orderBy: { paidAt: "asc" },
        }),
      ]);

    expect(updatedSubscription).toMatchObject({
      status: "active",
      startsAt: serviceWindows[0].startsAt,
      expiresAt: serviceWindows[2].endsAt,
      maxScheduledRuns: offer.maxScheduledRuns * 2,
      scheduledRunsUsed: 0,
      manualRunsRemaining: offer.manualRuns * 2,
    });
    expect(updatedSchedule).toMatchObject({ enabled: true, nextRunAt });
    expect(bindings).toHaveLength(3);
    expect(bindings.filter((binding) => binding.refundedAt !== null)).toEqual([
      expect.objectContaining({ orderId: refundedOrder.id, refundedAt }),
    ]);
    expect(
      bindings
        .filter((binding) => survivingOrderIds.includes(binding.orderId))
        .map((binding) => ({
          orderId: binding.orderId,
          refundedAt: binding.refundedAt,
          scheduledRunsGranted: binding.scheduledRunsGranted,
          manualRunsGranted: binding.manualRunsGranted,
        })),
    ).toEqual(
      expect.arrayContaining(
        survivingOrderIds.map((orderId) => ({
          orderId,
          refundedAt: null,
          scheduledRunsGranted: offer.maxScheduledRuns,
          manualRunsGranted: offer.manualRuns,
        })),
      ),
    );
    expect(survivingOrders).toHaveLength(2);
    expect(survivingOrders.every((order) => order.orderStatus === "activated")).toBe(true);
    expect(survivingPayments).toHaveLength(2);
    expect(survivingPayments.every((payment) => payment.status === "paid")).toBe(true);
  }, 30_000);

  it("preserves only the third renewal when two paid orders are refunded concurrently", async () => {
    const { offer, user, serviceWindows, subscription, nextRunAt, orders } =
      await createMonitoringRenewalFixture();
    const refundedOrders = orders.slice(0, 2);
    const survivingOrder = orders[2];
    const refundedAt = [
      new Date("2026-02-10T00:00:00.000Z"),
      new Date("2026-02-11T00:00:00.000Z"),
    ];

    await Promise.all(
      refundedOrders.map((order, index) =>
        db.$transaction((tx) =>
          revokeEntitlementsForRefundedOrder(
            tx,
            {
              id: order.id,
              userId: user.id,
              orderType: "seo_audit_monitoring",
            },
            refundedAt[index],
          ),
        ),
      ),
    );

    const [updatedSubscription, updatedSchedule, bindings, remainingOrder, remainingPayment] =
      await Promise.all([
        db.seoAuditSubscription.findUniqueOrThrow({ where: { id: subscription.id } }),
        db.seoAuditSchedule.findUniqueOrThrow({
          where: { subscriptionId: subscription.id },
        }),
        db.seoAuditSubscriptionOrder.findMany({
          where: { subscriptionId: subscription.id },
          orderBy: { serviceStartsAt: "asc" },
        }),
        db.order.findUniqueOrThrow({ where: { id: survivingOrder.id } }),
        db.paymentTransaction.findUniqueOrThrow({
          where: { orderId: survivingOrder.id },
        }),
      ]);

    expect(updatedSubscription).toMatchObject({
      status: "active",
      startsAt: serviceWindows[2].startsAt,
      expiresAt: serviceWindows[2].endsAt,
      maxScheduledRuns: offer.maxScheduledRuns,
      scheduledRunsUsed: 0,
      manualRunsRemaining: offer.manualRuns,
    });
    expect(updatedSchedule).toMatchObject({ enabled: true, nextRunAt });
    expect(bindings).toHaveLength(3);
    expect(bindings.filter((binding) => binding.refundedAt !== null)).toEqual([
      expect.objectContaining({ orderId: refundedOrders[0].id, refundedAt: refundedAt[0] }),
      expect.objectContaining({ orderId: refundedOrders[1].id, refundedAt: refundedAt[1] }),
    ]);
    expect(bindings.find((binding) => binding.orderId === survivingOrder.id)).toMatchObject({
      refundedAt: null,
      scheduledRunsGranted: offer.maxScheduledRuns,
      manualRunsGranted: offer.manualRuns,
      serviceStartsAt: serviceWindows[2].startsAt,
      serviceEndsAt: serviceWindows[2].endsAt,
    });
    expect(remainingOrder.orderStatus).toBe("activated");
    expect(remainingPayment.status).toBe("paid");
  }, 30_000);
});
