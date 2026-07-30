import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { revokeEntitlementsForRefundedOrder } from "@/lib/membership";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsedDatabaseUrl = new URL(databaseUrl);
  if (!new Set(["localhost", "127.0.0.1"]).has(parsedDatabaseUrl.hostname)) {
    throw new Error("SEO_AUDIT_TEST_DATABASE_URL must target localhost or 127.0.0.1.");
  }
}
const describePostgres = databaseUrl ? describe : describe.skip;

function createBarrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describePostgres("PostgreSQL membership refund isolation", () => {
  let db: PrismaClient;
  const userIds: string[] = [];
  const toolIds: string[] = [];
  const priceSpecIds: string[] = [];
  const orderIds: string[] = [];

  beforeAll(() => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 }
    });
  });

  afterAll(async () => {
    if (!db) return;
    if (userIds.length || toolIds.length) {
      await db.toolPurchase.deleteMany({
        where: {
          OR: [
            ...(userIds.length ? [{ userId: { in: userIds } }] : []),
            ...(toolIds.length ? [{ toolId: { in: toolIds } }] : [])
          ]
        }
      });
    }
    if (orderIds.length) {
      await db.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (priceSpecIds.length) {
      await db.toolPriceSpec.deleteMany({ where: { id: { in: priceSpecIds } } });
    }
    if (toolIds.length) {
      await db.tool.deleteMany({ where: { id: { in: toolIds } } });
    }
    if (userIds.length) {
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  });

  async function createSoftwareOrderPair() {
    const user = await db.user.create({
      data: {
        email: `task6-software-refund-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true
      }
    });
    userIds.push(user.id);
    const tool = await db.tool.create({
      data: {
        name: "Task 6 software refund fixture",
        slug: `task6-software-refund-${randomUUID()}`,
        type: "software",
        shortDescription: "Test-only software refund fixture.",
        content: "Test-only software refund fixture.",
        isVipRequired: false,
        isDownloadPaid: true,
        isDownloadLinkVipOnly: false,
        status: "draft"
      }
    });
    toolIds.push(tool.id);
    const [specA, specB] = await Promise.all([
      db.toolPriceSpec.create({
        data: { toolId: tool.id, name: "License A", price: "19.00", sortOrder: 1 }
      }),
      db.toolPriceSpec.create({
        data: { toolId: tool.id, name: "License B", price: "29.00", sortOrder: 2 }
      })
    ]);
    priceSpecIds.push(specA.id, specB.id);
    const timestamps = [
      new Date("2026-07-25T01:00:00.000Z"),
      new Date("2026-07-25T02:00:00.000Z")
    ];
    const orders = [];
    for (const [index, spec] of [specA, specB].entries()) {
      const order = await db.order.create({
        data: {
          orderNo: `TASK6-SOFTWARE-${randomUUID()}`,
          userId: user.id,
          toolId: tool.id,
          toolPriceSpecId: spec.id,
          toolPriceSpecName: spec.name,
          orderType: "software_download",
          amount: spec.price,
          paymentMethod: "wechat",
          orderStatus: "activated",
          paidAt: timestamps[index],
          activatedAt: timestamps[index],
          isTestData: true
        }
      });
      orderIds.push(order.id);
      await db.paymentTransaction.create({
        data: {
          orderId: order.id,
          provider: "zpay",
          providerTradeNo: `task6-software-${randomUUID()}`,
          paymentType: "wxpay",
          status: "paid",
          amount: order.amount,
          paidAt: order.paidAt
        }
      });
      await db.toolPurchase.upsert({
        where: { userId_toolId: { userId: user.id, toolId: tool.id } },
        update: {
          orderId: order.id,
          toolPriceSpecId: spec.id,
          toolPriceSpecName: spec.name,
          amount: order.amount
        },
        create: {
          userId: user.id,
          toolId: tool.id,
          orderId: order.id,
          toolPriceSpecId: spec.id,
          toolPriceSpecName: spec.name,
          amount: order.amount
        }
      });
      orders.push(order);
    }
    return { user, tool, specA, specB, orderA: orders[0], orderB: orders[1] };
  }

  async function refundOrder(
    order: { id: string; userId: string; toolId: string | null },
    hooks: {
      afterRevocation?: () => Promise<void>;
      onTransactionStarted?: (backendPid: number) => void;
    } = {}
  ) {
    const refundedAt = new Date("2026-07-25T03:00:00.000Z");
    await db.$transaction(async (tx) => {
      if (hooks.onTransactionStarted) {
        const [connection] = await tx.$queryRaw<Array<{ pid: number }>>(
          Prisma.sql`SELECT pg_backend_pid() AS pid`
        );
        if (!connection) throw new Error("Unable to identify refund transaction backend.");
        hooks.onTransactionStarted(connection.pid);
      }
      await revokeEntitlementsForRefundedOrder(
        tx,
        {
          id: order.id,
          userId: order.userId,
          orderType: "software_download",
          toolId: order.toolId
        },
        refundedAt
      );
      await hooks.afterRevocation?.();
      await tx.paymentTransaction.update({
        where: { orderId: order.id },
        data: { status: "refunded", refundedAt }
      });
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "refunded" }
      });
    });
  }

  async function waitForBlockedAdvisoryLock(
    monitor: PrismaClient,
    backendPid: number,
    completedBeforeBlocking: Promise<void>
  ) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const waiting = await monitor.$queryRaw<Array<{ waiting: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_locks
          WHERE pid = ${backendPid}
            AND locktype = 'advisory'
            AND granted = false
        ) AS waiting
      `);
      if (waiting[0]?.waiting) return;

      const next = await Promise.race([
        completedBeforeBlocking.then(() => "completed" as const),
        new Promise<"poll">((resolve) => setTimeout(() => resolve("poll"), 20))
      ]);
      if (next === "completed") {
        throw new Error("Concurrent refund completed without waiting on the advisory lock.");
      }
    }
    throw new Error("Timed out waiting for the concurrent advisory lock waiter.");
  }

  it("preserves B when the older software order A is refunded", async () => {
    const { user, tool, specB, orderA, orderB } = await createSoftwareOrderPair();

    await refundOrder(orderA);

    await expect(
      db.toolPurchase.findUniqueOrThrow({
        where: { userId_toolId: { userId: user.id, toolId: tool.id } }
      })
    ).resolves.toMatchObject({
      orderId: orderB.id,
      toolPriceSpecId: specB.id,
      toolPriceSpecName: specB.name,
      amount: orderB.amount
    });
  }, 30_000);

  it("rebinds the current software order B to surviving order A", async () => {
    const { user, tool, specA, orderA, orderB } = await createSoftwareOrderPair();

    await refundOrder(orderB);

    await expect(
      db.toolPurchase.findUniqueOrThrow({
        where: { userId_toolId: { userId: user.id, toolId: tool.id } }
      })
    ).resolves.toMatchObject({
      orderId: orderA.id,
      toolPriceSpecId: specA.id,
      toolPriceSpecName: specA.name,
      amount: orderA.amount
    });
  }, 30_000);

  it("does not rebind to an activated order with a pending refund", async () => {
    const { user, tool, orderA, orderB } = await createSoftwareOrderPair();
    await db.orderRefundRecord.create({
      data: {
        orderId: orderA.id,
        requesterId: user.id,
        amount: orderA.amount,
        status: "pending",
        reason: "Task 6 pending refund exclusion"
      }
    });

    await refundOrder(orderB);

    await expect(
      db.toolPurchase.findUnique({
        where: { userId_toolId: { userId: user.id, toolId: tool.id } }
      })
    ).resolves.toBeNull();
  }, 30_000);

  it("removes authorization after software orders A and B refund concurrently", async () => {
    const { user, tool, orderA, orderB } = await createSoftwareOrderPair();
    const aRevoked = createBarrier();
    const releaseA = createBarrier();
    const bRevoked = createBarrier();
    let resolveBackendPid!: (pid: number) => void;
    const backendPid = new Promise<number>((resolve) => {
      resolveBackendPid = resolve;
    });
    const monitor = new PrismaClient({ datasourceUrl: databaseUrl });
    const refundA = refundOrder(orderA, {
      afterRevocation: async () => {
        aRevoked.resolve();
        await releaseA.promise;
      }
    });
    await aRevoked.promise;
    const refundB = refundOrder(orderB, {
      onTransactionStarted: resolveBackendPid,
      afterRevocation: async () => {
        bRevoked.resolve();
      }
    });

    try {
      await waitForBlockedAdvisoryLock(monitor, await backendPid, bRevoked.promise);
    } finally {
      releaseA.resolve();
      await Promise.allSettled([refundA, refundB]);
      await monitor.$disconnect();
    }
    await Promise.all([refundA, refundB]);

    await expect(
      db.toolPurchase.findUnique({
        where: { userId_toolId: { userId: user.id, toolId: tool.id } }
      })
    ).resolves.toBeNull();
    await expect(
      db.order.count({
        where: { id: { in: [orderA.id, orderB.id] }, orderStatus: "refunded" }
      })
    ).resolves.toBe(2);
  }, 30_000);
});
