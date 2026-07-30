import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, type OrderStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildZpaySignedParams } from "@/lib/zpay";
import {
  type AdminOrderMutationDb,
  createRefundRecordForAdmin,
  prepareRefundExecutionForAdmin,
  rejectRefundRecordForAdmin,
  updateOrderForAdmin,
} from "@/lib/admin-order-mutations";
import { resolveAmbiguousZpayRefund } from "@/lib/refund-execution";
import type { ZpayConfig } from "@/lib/zpay-config";
import { activateOrderFromZpayNotify, ensureZpayPaymentForOrder } from "@/lib/zpay-orders";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();
  if (
    !new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname) ||
    !/(test|task6|codex)/.test(databaseName)
  ) {
    throw new Error("SEO_AUDIT_TEST_DATABASE_URL must target an explicit local test database.");
  }
}
const describePostgres = databaseUrl ? describe : describe.skip;
const applicationNames = {
  target: `t6-admin-order-${randomUUID()}-target`,
  blocker: `t6-admin-order-${randomUUID()}-blocker`,
  observer: `t6-admin-order-${randomUUID()}-observer`,
};

function withApplicationName(applicationName: string) {
  if (!databaseUrl) return undefined;
  const url = new URL(databaseUrl);
  url.searchParams.set("application_name", applicationName);
  return url.toString();
}

const config: ZpayConfig = {
  mode: "live",
  apiBase: "https://zpayz.cn",
  pid: "task6-test-merchant",
  key: "task6_test_secret_32_chars_1234567890",
  defaultType: "wxpay",
  channelId: "task6-channel",
  siteUrl: "https://www.enhe-tech.com.cn",
};

function createDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describePostgres("PostgreSQL admin order mutation serialization", () => {
  let db: PrismaClient;
  let blockerDb: PrismaClient;
  let observerDb: PrismaClient;
  let adminId: string;
  const userIds: string[] = [];
  const orderIds: string[] = [];
  const planIds: string[] = [];

  beforeAll(async () => {
    db = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.target),
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    blockerDb = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.blocker),
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    observerDb = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.observer),
    });
    const admin = await db.user.create({
      data: {
        email: `task6-mutation-admin-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        role: "admin",
        isTestData: true,
      },
      select: { id: true },
    });
    adminId = admin.id;
    userIds.push(admin.id);
  });

  afterAll(async () => {
    if (!db) return;
    if (orderIds.length) {
      await db.adminAuditLog.deleteMany({ where: { targetId: { in: orderIds } } });
      await db.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (userIds.length) {
      await db.membership.deleteMany({ where: { userId: { in: userIds } } });
    }
    if (planIds.length) {
      await db.vipPlan.deleteMany({ where: { id: { in: planIds } } });
    }
    if (userIds.length) {
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await Promise.all([db.$disconnect(), blockerDb.$disconnect(), observerDb.$disconnect()]);
  });

  async function createOrder(input: {
    amount?: string;
    orderStatus?: OrderStatus;
    withPayment?: boolean;
  } = {}) {
    const offer = await db.seoAuditOffer.findUniqueOrThrow({ where: { code: "professional" } });
    const user = await db.user.create({
      data: {
        email: `task6-mutation-user-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const amount = input.amount ?? "19.90";
    const orderStatus = input.orderStatus ?? "pending_payment";
    const order = await db.order.create({
      data: {
        orderNo: `TASK6-MUTATION-${randomUUID()}`,
        userId: user.id,
        orderType: "seo_audit_credit",
        seoAuditOfferId: offer.id,
        seoAuditTargetOrigin: "https://example.com",
        amount,
        paymentMethod: "wechat",
        orderStatus,
        paidAt: orderStatus === "paid" || orderStatus === "activated" ? new Date() : null,
        activatedAt: orderStatus === "activated" ? new Date() : null,
        isTestData: true,
      },
    });
    orderIds.push(order.id);
    const payment = input.withPayment
      ? await db.paymentTransaction.create({
          data: {
            orderId: order.id,
            provider: "zpay",
            providerTradeNo: `provider-${randomUUID()}`,
            paymentType: "wxpay",
            status: orderStatus === "paid" || orderStatus === "activated" ? "paid" : "pending",
            amount,
          },
        })
      : null;
    return { user, order, payment };
  }

  async function createVipOrder() {
    const plan = await db.vipPlan.create({
      data: {
        name: `Task 6 VIP ${randomUUID()}`,
        durationDays: 30,
        price: "19.90",
        status: "active",
      },
    });
    planIds.push(plan.id);
    const user = await db.user.create({
      data: {
        email: `task6-vip-refund-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const order = await db.order.create({
      data: {
        orderNo: `TASK6-VIP-REFUND-${randomUUID()}`,
        userId: user.id,
        planId: plan.id,
        orderType: "vip",
        amount: plan.price,
        paymentMethod: "wechat",
        orderStatus: "paid",
        paidAt: new Date(),
        isTestData: true,
      },
    });
    orderIds.push(order.id);
    return { plan, user, order };
  }

  async function lockAdminAuditTable() {
    const locked = createDeferred();
    const release = createDeferred();
    const done = blockerDb.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "admin_audit_logs" IN ACCESS EXCLUSIVE MODE');
      locked.resolve(undefined);
      await release.promise;
    });
    void done.catch(locked.reject);
    await locked.promise;
    return { release: () => release.resolve(undefined), done };
  }

  async function lockOrder(orderId: string) {
    const locked = createDeferred();
    const release = createDeferred();
    const done = blockerDb.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
      locked.resolve(undefined);
      await release.promise;
    });
    void done.catch(locked.reject);
    await locked.promise;
    return { release: () => release.resolve(undefined), done };
  }

  async function lockUser(userId: string) {
    const locked = createDeferred();
    const release = createDeferred();
    const done = blockerDb.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
      locked.resolve(undefined);
      await release.promise;
    });
    void done.catch(locked.reject);
    await locked.promise;
    return { release: () => release.resolve(undefined), done };
  }

  async function waitForBlockedQuery(fragment: string) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const rows = await observerDb.$queryRaw<
        Array<{
          query: string;
          applicationName: string;
          waitEventType: string | null;
          hasUngrantedLock: boolean;
        }>
      >(Prisma.sql`
        SELECT
          activity.query,
          activity.application_name AS "applicationName",
          activity.wait_event_type AS "waitEventType",
          BOOL_OR(NOT locks.granted) AS "hasUngrantedLock"
        FROM pg_stat_activity AS activity
        INNER JOIN pg_locks AS locks ON locks.pid = activity.pid
        WHERE activity.datname = current_database()
          AND activity.pid <> pg_backend_pid()
          AND activity.state = 'active'
          AND activity.application_name = ${applicationNames.target}
          AND activity.query ILIKE ${`%${fragment}%`}
        GROUP BY activity.pid, activity.query, activity.application_name, activity.wait_event_type
        HAVING BOOL_OR(NOT locks.granted)
      `);
      if (rows.length) {
        expect(rows[0]).toMatchObject({
          applicationName: applicationNames.target,
          waitEventType: "Lock",
          hasUngrantedLock: true,
        });
        return rows[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for a blocked PostgreSQL query containing: ${fragment}`);
  }

  function updateInput(orderId: string, amount: number, orderStatus: OrderStatus = "pending_payment") {
    return {
      db,
      orderId,
      adminId,
      amount,
      paymentMethod: "wechat" as const,
      orderStatus,
      auditContext: { ip: "127.0.0.1", userAgent: "task6-test" },
    };
  }

  function refundInput(orderId: string, amount: number | string = 19.9) {
    return {
      db,
      orderId,
      adminId,
      amount,
      requestedStatus: "pending" as const,
      reason: "Concurrent full refund",
      note: null,
      refundReceiverQr: null,
      refundProofImage: null,
      auditContext: { ip: "127.0.0.1", userAgent: "task6-test" },
    };
  }

  function refundExecutionInput(refundId: string, dbOverride: AdminOrderMutationDb = db) {
    return {
      db: dbOverride,
      refundId,
      adminId,
      note: null,
      refundProofImage: null,
      now: new Date("2026-07-26T12:00:00.000Z"),
    };
  }

  function createFailingAuditDb(): AdminOrderMutationDb {
    return {
      $transaction: (callback) => db.$transaction(async (tx) => {
        const failingAuditTx = new Proxy(tx, {
          get(target, property, receiver) {
            if (property === "adminAuditLog") {
              return {
                ...target.adminAuditLog,
                create: async () => {
                  throw new Error("AUDIT_INSERT_FAILED");
                },
              };
            }
            return Reflect.get(target, property, receiver);
          },
        });
        return callback(failingAuditTx as Prisma.TransactionClient);
      }),
    };
  }

  it("rejects an amount change while the provider dispatch barrier is open", async () => {
    const fixture = await createOrder();
    const providerStarted = createDeferred();
    const releaseProvider = createDeferred();
    const ensuring = ensureZpayPaymentForOrder(
      { orderId: fixture.order.id },
      {
        db,
        config,
        requestPayment: vi.fn(async () => {
          providerStarted.resolve(undefined);
          await releaseProvider.promise;
          return { code: 1, qrcode: "https://pay.example.test/admin-race" };
        }),
      },
    );
    await providerStarted.promise;

    try {
      await expect(updateOrderForAdmin(updateInput(fixture.order.id, 29.9))).rejects.toThrow(
        "Order amount cannot change after payment creation.",
      );
      expect(
        await db.paymentTransaction.findUnique({ where: { orderId: fixture.order.id } }),
      ).not.toBeNull();
    } finally {
      releaseProvider.resolve(undefined);
      await Promise.allSettled([ensuring]);
    }
  }, 30_000);

  it("makes payment wait for an in-flight admin update and dispatches the committed new amount", async () => {
    const fixture = await createOrder();
    const tableLock = await lockAdminAuditTable();
    const update = updateOrderForAdmin(updateInput(fixture.order.id, 29.9));
    let payment: ReturnType<typeof ensureZpayPaymentForOrder> | null = null;
    const requestPayment = vi.fn().mockResolvedValue({
      code: 1,
      qrcode: "https://pay.example.test/new-amount",
    });

    try {
      await waitForBlockedQuery("admin_audit_logs");
      payment = ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment },
      );
      const blockedPayment = await waitForBlockedQuery("FOR UPDATE");
      expect(blockedPayment.query).toContain("orders");
    } finally {
      tableLock.release();
      await tableLock.done;
    }

    await update;
    await payment;
    expect(requestPayment).toHaveBeenCalledTimes(1);
    expect(requestPayment.mock.calls[0]?.[0]?.params.money).toBe("29.90");
  }, 30_000);

  it("rolls back the order update when the audit insert fails", async () => {
    const fixture = await createOrder();

    await expect(
      updateOrderForAdmin({
        ...updateInput(fixture.order.id, 29.9),
        adminId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    const order = await db.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    expect(order.amount.equals(fixture.order.amount)).toBe(true);
  }, 30_000);

  it.each(["pending", "completed", "rejected"] as const)(
    "rejects amount changes after a %s refund attempt",
    async (refundStatus) => {
      const fixture = await createOrder({ orderStatus: "paid" });
      await db.orderRefundRecord.create({
        data: {
          orderId: fixture.order.id,
          adminId,
          amount: fixture.order.amount,
          status: refundStatus,
          reason: "Historical attempt",
        },
      });

      await expect(
        updateOrderForAdmin(updateInput(fixture.order.id, 29.9, "paid")),
      ).rejects.toThrow("Order amount cannot change after payment creation.");
    },
    30_000,
  );

  it("returns locked order details without exposing a provider snapshot", async () => {
    const fixture = await createOrder({ orderStatus: "paid", withPayment: true });

    const created = await createRefundRecordForAdmin(refundInput(fixture.order.id));
    expect(created).not.toHaveProperty("provider");
    expect(created).toMatchObject({
      order: {
        id: fixture.order.id,
        userId: fixture.user.id,
        orderNo: fixture.order.orderNo,
        amount: Number(fixture.order.amount),
      },
    });
  }, 30_000);

  it.each(["pending", "completed", "rejected"] as const)(
    "rejects a %s refund record as an existing refund attempt",
    async (refundStatus) => {
      const historicalRefund = await createOrder({ orderStatus: "paid" });
      await db.orderRefundRecord.create({
        data: {
          orderId: historicalRefund.order.id,
          adminId,
          amount: historicalRefund.order.amount,
          status: refundStatus,
          reason: "Historical attempt",
        },
      });
      await expect(
        createRefundRecordForAdmin(refundInput(historicalRefund.order.id)),
      ).rejects.toThrow("REFUND_ATTEMPT_EXISTS");
    },
    30_000,
  );

  it("rejects provider refund state as an existing refund attempt", async () => {
    const providerState = await createOrder({ orderStatus: "paid", withPayment: true });
    await db.paymentTransaction.update({
      where: { orderId: providerState.order.id },
      data: { refundState: "requested" },
    });
    await expect(createRefundRecordForAdmin(refundInput(providerState.order.id))).rejects.toThrow(
      "REFUND_ATTEMPT_EXISTS",
    );
  }, 30_000);

  it("rolls back refund creation when the audit insert fails", async () => {
    const fixture = await createOrder({ orderStatus: "paid" });
    const failingAuditDb = createFailingAuditDb();

    await expect(
      createRefundRecordForAdmin({ ...refundInput(fixture.order.id), db: failingAuditDb }),
    ).rejects.toThrow("AUDIT_INSERT_FAILED");
    expect(
      await db.orderRefundRecord.count({ where: { orderId: fixture.order.id } }),
    ).toBe(0);
  }, 30_000);

  it("re-reads a newly committed ZPAY payment before refund execution", async () => {
    const fixture = await createOrder({ orderStatus: "paid" });
    const created = await createRefundRecordForAdmin(refundInput(fixture.order.id));
    await db.paymentTransaction.create({
      data: {
        orderId: fixture.order.id,
        provider: "zpay",
        providerTradeNo: `provider-${randomUUID()}`,
        paymentType: "wxpay",
        status: "paid",
        amount: fixture.order.amount,
      },
    });

    await expect(
      prepareRefundExecutionForAdmin(refundExecutionInput(created.refund.id)),
    ).resolves.toEqual({ kind: "zpay" });
    const [order, refund, payment] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: created.refund.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ]);
    expect(order.orderStatus).toBe("paid");
    expect(refund.status).toBe("pending");
    expect(payment.status).toBe("paid");
    expect(payment.refundedAt).toBeNull();
  }, 30_000);

  it("routes a payment writer that acquires the order lock first through ZPAY", async () => {
    const fixture = await createOrder({ orderStatus: "paid" });
    const created = await createRefundRecordForAdmin(refundInput(fixture.order.id));
    const orderLock = await lockOrder(fixture.order.id);
    const paymentWrite = db.paymentTransaction.create({
      data: {
        orderId: fixture.order.id,
        provider: "zpay",
        providerTradeNo: `provider-${randomUUID()}`,
        paymentType: "wxpay",
        status: "paid",
        amount: fixture.order.amount,
      },
    }).then((payment) => payment);
    let prepared: ReturnType<typeof prepareRefundExecutionForAdmin> | null = null;

    try {
      await waitForBlockedQuery("payment_transactions");
      prepared = prepareRefundExecutionForAdmin(refundExecutionInput(created.refund.id));
      await waitForBlockedQuery("FOR UPDATE");
    } finally {
      orderLock.release();
      await orderLock.done;
    }

    await paymentWrite;
    await expect(prepared).resolves.toEqual({ kind: "zpay" });
  }, 30_000);

  it("finalizes a manual refund atomically and rolls it back when its audit fails", async () => {
    const finalizedFixture = await createOrder({ orderStatus: "paid" });
    const finalizedRefund = await createRefundRecordForAdmin(refundInput(finalizedFixture.order.id));

    await expect(
      prepareRefundExecutionForAdmin(refundExecutionInput(finalizedRefund.refund.id)),
    ).resolves.toEqual({ kind: "manual_finalized", outcome: "finalized" });
    const [finalizedOrder, finalizedRecord, finalizationAudit] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: finalizedFixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: finalizedRefund.refund.id } }),
      db.adminAuditLog.findFirst({
        where: { targetId: finalizedFixture.order.id, action: "order.refund.finalized" },
      }),
    ]);
    expect(finalizedOrder.orderStatus).toBe("refunded");
    expect(finalizedRecord.status).toBe("completed");
    expect(finalizedRecord.completedAt).toEqual(new Date("2026-07-26T12:00:00.000Z"));
    expect(finalizationAudit).not.toBeNull();

    const rollbackFixture = await createOrder({ orderStatus: "paid" });
    const rollbackRefund = await createRefundRecordForAdmin(refundInput(rollbackFixture.order.id));
    await expect(
      prepareRefundExecutionForAdmin(
        refundExecutionInput(rollbackRefund.refund.id, createFailingAuditDb()),
      ),
    ).rejects.toThrow("AUDIT_INSERT_FAILED");
    const [rollbackOrder, rollbackRecord] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: rollbackFixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: rollbackRefund.refund.id } }),
    ]);
    expect(rollbackOrder.orderStatus).toBe("paid");
    expect(rollbackRecord.status).toBe("pending");
    expect(rollbackRecord.completedAt).toBeNull();
  }, 30_000);

  it("requires provider reconciliation when a ZPAY success arrives after a manual refund", async () => {
    const fixture = await createOrder({ orderStatus: "paid" });
    const created = await createRefundRecordForAdmin(refundInput(fixture.order.id));
    await prepareRefundExecutionForAdmin(refundExecutionInput(created.refund.id));

    const callbackAt = new Date("2026-07-26T13:00:00.000Z");
    const payload = buildZpaySignedParams(
      {
        pid: config.pid,
        money: fixture.order.amount.toFixed(2),
        out_trade_no: fixture.order.orderNo,
        trade_no: `late-payment-${randomUUID()}`,
        param: fixture.order.id,
        trade_status: "TRADE_SUCCESS",
        type: "wxpay",
      },
      config.key,
    );

    await expect(
      activateOrderFromZpayNotify(payload, { db, config, now: () => callbackAt }),
    ).resolves.toEqual({ ok: true, response: "success", status: 200 });

    const [orderAfterCallback, refundAfterCallback, paymentAfterCallback] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: created.refund.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ]);
    expect(orderAfterCallback.orderStatus).toBe("refunded");
    expect(refundAfterCallback.status).toBe("pending");
    expect(refundAfterCallback.completedAt).toBeNull();
    expect(paymentAfterCallback).toMatchObject({
      provider: "zpay",
      status: "paid",
      refundState: "ambiguous",
      refundRecordId: created.refund.id,
      refundDispatchCount: 0,
      refundLastErrorCode: "late-payment-after-local-refund",
    });
    expect(paymentAfterCallback.refundedAt).toBeNull();
    expect(paymentAfterCallback.paidAt).toEqual(callbackAt);

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_rejected",
          note: "The late payment remains captured by ZPAY.",
        },
        { db },
      ),
    ).rejects.toThrow("LATE_PAYMENT_REFUND_MUST_BE_CONFIRMED");

    expect(
      await db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ).toMatchObject({
      status: "paid",
      refundState: "ambiguous",
      refundLastErrorCode: "late-payment-after-local-refund",
    });

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed refunded in the ZPAY console.",
          refundProofImage: "https://example.test/late-payment-refund-proof.png",
        },
        { db, now: () => new Date("2026-07-26T13:04:00.000Z") },
      ),
    ).rejects.toThrow("REFUND_PROVIDER_REFERENCE_REQUIRED");

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed refunded in the ZPAY console.",
          providerRefundReference: "ZPAY-REFUND-LATE-10001",
        },
        { db, now: () => new Date("2026-07-26T13:04:30.000Z") },
      ),
    ).rejects.toThrow("REFUND_PROOF_REQUIRED");

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed refunded in the ZPAY console.",
          providerRefundReference: "x",
          refundProofImage: "https://example.test/late-payment-refund-proof.png",
        },
        { db, now: () => new Date("2026-07-26T13:04:40.000Z") },
      ),
    ).rejects.toThrow("REFUND_PROVIDER_REFERENCE_INVALID");

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed refunded in the ZPAY console.",
          providerRefundReference: "ZPAY-REFUND-LATE-10001",
          refundProofImage: "javascript:alert(1)",
        },
        { db, now: () => new Date("2026-07-26T13:04:50.000Z") },
      ),
    ).rejects.toThrow("REFUND_PROOF_INVALID");

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Confirmed refunded in the ZPAY console.",
          providerRefundReference: "ZPAY-REFUND-LATE-10001",
          refundProofImage: "https://example.test/late-payment-refund-proof.png",
        },
        { db, now: () => new Date("2026-07-26T13:05:00.000Z") },
      ),
    ).resolves.toEqual({ outcome: "finalized", changed: true });

    const [finalOrder, finalRefund, finalPayment] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: created.refund.id } }),
      db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ]);
    expect(finalOrder.orderStatus).toBe("refunded");
    expect(finalRefund).toMatchObject({
      status: "completed",
      note: "Confirmed refunded in the ZPAY console.",
      refundProofImage: "https://example.test/late-payment-refund-proof.png",
    });
    expect(finalPayment).toMatchObject({
      status: "refunded",
      refundState: "finalized",
      refundRecordId: created.refund.id,
      refundPayload: {
        kind: "manual-provider-refund-confirmation",
        provider: "zpay",
        providerRefundReference: "ZPAY-REFUND-LATE-10001",
        amount: fixture.order.amount.toFixed(2),
        confirmedAt: "2026-07-26T13:05:00.000Z",
        refundProofImage: "https://example.test/late-payment-refund-proof.png",
      },
    });

    await expect(
      resolveAmbiguousZpayRefund(
        {
          refundId: created.refund.id,
          adminId,
          resolution: "provider_succeeded",
          note: "Must not overwrite the original evidence.",
          providerRefundReference: "ZPAY-REFUND-LATE-CHANGED",
          refundProofImage: "https://example.test/changed-proof.png",
        },
        { db, now: () => new Date("2026-07-26T13:06:00.000Z") },
      ),
    ).resolves.toEqual({ outcome: "finalized", changed: false });
    expect(
      await db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ).toMatchObject({
      refundPayload: {
        providerRefundReference: "ZPAY-REFUND-LATE-10001",
        confirmedAt: "2026-07-26T13:05:00.000Z",
      },
    });
  }, 30_000);

  it("waits for the VIP user lock before acquiring the refunded order lock", async () => {
    const fixture = await createVipOrder();
    const created = await createRefundRecordForAdmin(
      refundInput(fixture.order.id, fixture.order.amount.toFixed(2)),
    );
    const userLock = await lockUser(fixture.user.id);
    const preparing = prepareRefundExecutionForAdmin(refundExecutionInput(created.refund.id));

    try {
      const blocked = await waitForBlockedQuery("FROM users");
      expect(blocked.query).toContain("users");
      await expect(
        observerDb.$transaction((tx) =>
          tx.$queryRaw(
            Prisma.sql`SELECT id FROM orders WHERE id = ${fixture.order.id} FOR UPDATE NOWAIT`,
          ),
        ),
      ).resolves.toEqual([{ id: fixture.order.id }]);
    } finally {
      userLock.release();
      await userLock.done;
    }

    await expect(preparing).resolves.toEqual({
      kind: "manual_finalized",
      outcome: "finalized",
    });
  }, 30_000);

  it("serializes refund rejection and rolls it back when its audit fails", async () => {
    const fixture = await createOrder({ orderStatus: "paid" });
    const created = await createRefundRecordForAdmin(refundInput(fixture.order.id));
    const decisions = await Promise.allSettled([
      rejectRefundRecordForAdmin(refundExecutionInput(created.refund.id)),
      rejectRefundRecordForAdmin(refundExecutionInput(created.refund.id)),
    ]);
    expect(decisions.filter((decision) => decision.status === "fulfilled")).toHaveLength(1);
    expect(decisions.filter((decision) => decision.status === "rejected")).toHaveLength(1);
    const [record, audits] = await Promise.all([
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: created.refund.id } }),
      db.adminAuditLog.count({
        where: { targetId: fixture.order.id, action: "order.refund.provider_rejected" },
      }),
    ]);
    expect(record.status).toBe("rejected");
    expect(audits).toBe(1);

    const rollbackFixture = await createOrder({ orderStatus: "paid" });
    const rollbackRefund = await createRefundRecordForAdmin(refundInput(rollbackFixture.order.id));
    await expect(
      rejectRefundRecordForAdmin(
        refundExecutionInput(rollbackRefund.refund.id, createFailingAuditDb()),
      ),
    ).rejects.toThrow("AUDIT_INSERT_FAILED");
    expect(
      await db.orderRefundRecord.findUniqueOrThrow({ where: { id: rollbackRefund.refund.id } }),
    ).toMatchObject({ status: "pending", adminId });
  }, 30_000);

  it("does not reject a refund after provider dispatch has started", async () => {
    const fixture = await createOrder({ orderStatus: "paid", withPayment: true });
    const created = await createRefundRecordForAdmin(refundInput(fixture.order.id));
    await db.paymentTransaction.update({
      where: { orderId: fixture.order.id },
      data: {
        refundRecordId: created.refund.id,
        refundState: "dispatching",
        refundDispatchCount: 1,
        refundDispatchStartedAt: new Date(),
      },
    });

    await expect(
      rejectRefundRecordForAdmin(refundExecutionInput(created.refund.id)),
    ).rejects.toThrow("REFUND_STATE_MISMATCH");
    expect(
      await db.orderRefundRecord.findUniqueOrThrow({ where: { id: created.refund.id } }),
    ).toMatchObject({ status: "pending" });
  }, 30_000);

  it("keeps refund and order amounts equal when refund creation wins the row-lock race", async () => {
    const fixture = await createOrder({ orderStatus: "paid" });
    const tableLock = await lockAdminAuditTable();
    const refundCreation = createRefundRecordForAdmin(refundInput(fixture.order.id));
    let update: ReturnType<typeof updateOrderForAdmin> | null = null;

    try {
      await waitForBlockedQuery("admin_audit_logs");
      update = updateOrderForAdmin(updateInput(fixture.order.id, 29.9, "paid"));
      const blockedUpdate = await waitForBlockedQuery("FOR UPDATE");
      expect(blockedUpdate.query).toContain("orders");
    } finally {
      tableLock.release();
      await tableLock.done;
    }

    const created = await refundCreation;
    await expect(update).rejects.toThrow("Order amount cannot change after payment creation.");
    const [order, refund] = await Promise.all([
      db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      db.orderRefundRecord.findUniqueOrThrow({ where: { id: created.refund.id } }),
    ]);
    expect(refund.amount.equals(order.amount)).toBe(true);
  }, 30_000);
});
