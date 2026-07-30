import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildZpaySignedParams } from "@/lib/zpay";
import type { ZpayConfig } from "@/lib/zpay-config";
import {
  activateOrderFromZpayNotify,
  buildZpayPaymentRequest,
  ensureZpayPaymentForOrder,
} from "@/lib/zpay-orders";
import { updateOrderForAdmin } from "@/lib/admin-order-mutations";

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

type PaymentRequest = ReturnType<typeof buildZpayPaymentRequest>;

function createDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describePostgres("PostgreSQL ZPAY payment creation serialization", () => {
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
    if (orderIds.length) {
      await db.adminAuditLog.deleteMany({ where: { targetId: { in: orderIds } } });
      await db.seoAuditRun.deleteMany({ where: { sourceOrderId: { in: orderIds } } });
      await db.seoAuditCredit.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.paymentTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.orderRefundRecord.deleteMany({ where: { orderId: { in: orderIds } } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (userIds.length) {
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
  });

  async function createOrder(amount = "19.90") {
    const offer = await db.seoAuditOffer.findUniqueOrThrow({ where: { code: "professional" } });
    const user = await db.user.create({
      data: {
        email: `task6-zpay-race-${randomUUID()}@example.test`,
        passwordHash: "test-only",
        isTestData: true,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    const order = await db.order.create({
      data: {
        orderNo: `TASK6-ZPAY-RACE-${randomUUID()}`,
        userId: user.id,
        orderType: "seo_audit_credit",
        seoAuditOfferId: offer.id,
        seoAuditTargetOrigin: "https://example.com",
        amount,
        paymentMethod: "wechat",
        orderStatus: "pending_payment",
        isTestData: true,
      },
    });
    orderIds.push(order.id);
    return { offer, user, order };
  }

  it.each(["paid", "activated", "refunded"] as const)(
    "fails closed when a %s order has no payment transaction",
    async (orderStatus) => {
      const fixture = await createOrder();
      await db.order.update({
        where: { id: fixture.order.id },
        data: { orderStatus },
      });
      const requestPayment = vi.fn().mockResolvedValue({
        code: 1,
        qrcode: "https://pay.example.test/must-not-dispatch",
      });

      await expect(
        ensureZpayPaymentForOrder(
          { orderId: fixture.order.id },
          { db, config, requestPayment },
        ),
      ).rejects.toThrow("ZPAY_ORDER_ALREADY_PAID_WITHOUT_TRANSACTION");
      expect(requestPayment).not.toHaveBeenCalled();
      expect(
        await db.paymentTransaction.findUnique({ where: { orderId: fixture.order.id } }),
      ).toBeNull();
    },
  );

  it.each([
    {
      caseName: "a non-ZPAY provider",
      provider: "manual",
      amount: "19.90",
      paymentType: "wxpay",
      metadata: {},
    },
    {
      caseName: "a stale amount",
      provider: "zpay",
      amount: "9.90",
      paymentType: "wxpay",
      metadata: { requestAmount: "9.90" },
    },
    {
      caseName: "a stale order number",
      provider: "zpay",
      amount: "19.90",
      paymentType: "wxpay",
      metadata: { requestOrderNo: "TASK6-STALE-ORDER-NO" },
    },
    {
      caseName: "a stale payment type",
      provider: "zpay",
      amount: "19.90",
      paymentType: "alipay",
      metadata: { requestType: "alipay" },
    },
  ])("rejects displayable pending reuse with $caseName", async (reuseCase) => {
    const fixture = await createOrder();
    const rawResponse = {
      requestVersion: "paid-download-v3",
      creationState: "created",
      requestType: "wxpay",
      requestOrderNo: fixture.order.orderNo,
      requestAmount: "19.90",
      ...reuseCase.metadata,
    };
    const existing = await db.paymentTransaction.create({
      data: {
        orderId: fixture.order.id,
        provider: reuseCase.provider,
        paymentType: reuseCase.paymentType,
        status: "pending",
        amount: reuseCase.amount,
        qrCodeUrl: "https://pay.example.test/existing",
        rawResponse,
      },
    });
    const requestPayment = vi.fn();

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_REUSE_UNSAFE");
    expect(requestPayment).not.toHaveBeenCalled();
    expect(
      await db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }),
    ).toMatchObject({
      id: existing.id,
      provider: reuseCase.provider,
      paymentType: reuseCase.paymentType,
      status: "pending",
      rawResponse,
    });
  });

  it("reuses an exact displayable created ZPAY payment without redispatching", async () => {
    const fixture = await createOrder();
    const existing = await db.paymentTransaction.create({
      data: {
        orderId: fixture.order.id,
        provider: "zpay",
        paymentType: "wxpay",
        status: "pending",
        amount: fixture.order.amount,
        qrCodeUrl: "https://pay.example.test/exact-reuse",
        rawResponse: {
          requestVersion: "paid-download-v3",
          creationState: "created",
          requestType: "wxpay",
          requestOrderNo: fixture.order.orderNo,
          requestAmount: "19.90",
        },
      },
    });
    const requestPayment = vi.fn();

    const result = await ensureZpayPaymentForOrder(
      { orderId: fixture.order.id },
      { db, config, requestPayment },
    );

    expect(result.transaction.id).toBe(existing.id);
    expect(result.displayUrl).toBe("https://pay.example.test/exact-reuse");
    expect(requestPayment).not.toHaveBeenCalled();
  });

  it("persists the frozen dispatch placeholder before calling the provider", async () => {
    const fixture = await createOrder();
    const providerStarted = createDeferred<PaymentRequest>();
    const releaseProvider = createDeferred();
    const requestPayment = vi.fn(async (request: PaymentRequest) => {
      providerStarted.resolve(request);
      await releaseProvider.promise;
      return {
        code: 1,
        trade_no: `provider-${randomUUID()}`,
        qrcode: "https://pay.example.test/frozen",
      };
    });
    const ensuring = ensureZpayPaymentForOrder(
      { orderId: fixture.order.id, userId: fixture.user.id },
      { db, config, requestPayment },
    );

    try {
      const request = await providerStarted.promise;
      const placeholder = await db.paymentTransaction.findUnique({
        where: { orderId: fixture.order.id },
      });
      expect(placeholder).not.toBeNull();
      expect(placeholder?.status).toBe("pending");
      expect(placeholder?.amount.equals(fixture.order.amount)).toBe(true);
      expect(placeholder?.paymentType).toBe(request.params.type);
      expect(placeholder?.rawResponse).toEqual({
        requestVersion: "paid-download-v3",
        creationState: "dispatching",
        requestType: request.params.type,
        requestOrderNo: fixture.order.orderNo,
        requestAmount: "19.90",
      });
      expect(JSON.stringify(placeholder?.rawResponse)).not.toMatch(/sign|secret|key/i);
    } finally {
      releaseProvider.resolve(undefined);
    }

    const payment = await ensuring;
    expect(payment.transaction.rawResponse).toEqual({
      requestVersion: "paid-download-v3",
      creationState: "created",
      requestType: "wxpay",
      requestOrderNo: fixture.order.orderNo,
      requestAmount: "19.90",
    });
  }, 30_000);

  it("dispatches only once when two ensures race for the same order", async () => {
    const fixture = await createOrder();
    const providerStarted = createDeferred();
    const releaseProvider = createDeferred();
    const requestPayment = vi.fn(async () => {
      providerStarted.resolve(undefined);
      await releaseProvider.promise;
      return {
        code: 1,
        trade_no: `provider-${randomUUID()}`,
        qrcode: "https://pay.example.test/once",
      };
    });
    const first = ensureZpayPaymentForOrder(
      { orderId: fixture.order.id },
      { db, config, requestPayment },
    );
    await providerStarted.promise;
    const second = ensureZpayPaymentForOrder(
      { orderId: fixture.order.id },
      { db, config, requestPayment },
    ).then(
      () => ({ kind: "resolved" as const, message: null }),
      (error: unknown) => ({
        kind: "rejected" as const,
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    try {
      const secondOutcome = await Promise.race([
        second,
        delay(750).then(() => ({ kind: "timeout" as const, message: null })),
      ]);
      expect(secondOutcome).toEqual({
        kind: "rejected",
        message: "ZPAY_PAYMENT_CREATION_IN_PROGRESS",
      });
      expect(requestPayment).toHaveBeenCalledTimes(1);
    } finally {
      releaseProvider.resolve(undefined);
      await Promise.allSettled([first, second]);
    }
  }, 30_000);

  it("returns a callback-paid transaction without reverting it to pending", async () => {
    const fixture = await createOrder();
    const requestPayment = vi.fn(async () => {
      const payload = buildZpaySignedParams(
        {
          pid: config.pid,
          money: "19.90",
          out_trade_no: fixture.order.orderNo,
          trade_no: `callback-${randomUUID()}`,
          param: fixture.order.id,
          trade_status: "TRADE_SUCCESS",
          type: "wxpay",
        },
        config.key,
      );
      await activateOrderFromZpayNotify(payload, { db, config });
      return {
        code: 1,
        trade_no: `response-${randomUUID()}`,
        qrcode: "https://pay.example.test/already-paid",
      };
    });

    const result = await ensureZpayPaymentForOrder(
      { orderId: fixture.order.id },
      { db, config, requestPayment },
    );

    expect(result.transaction.status).toBe("paid");
    expect(
      (await db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } })).status,
    ).toBe("paid");
  }, 30_000);

  it("marks a thrown provider request ambiguous and requires manual reconciliation", async () => {
    const fixture = await createOrder();
    const providerError = new DOMException("payment request timed out", "AbortError");
    const requestPayment = vi.fn().mockRejectedValue(providerError);

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment },
      ),
    ).rejects.toBe(providerError);

    const transaction = await db.paymentTransaction.findUniqueOrThrow({
      where: { orderId: fixture.order.id },
    });
    expect(transaction.status).toBe("pending");
    expect(transaction.rawResponse).toEqual({
      requestVersion: "paid-download-v3",
      creationState: "ambiguous",
      requestType: "wxpay",
      requestOrderNo: fixture.order.orderNo,
      requestAmount: "19.90",
    });
    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED");
    expect(requestPayment).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("marks a provider rejection failed but never automatically redispatches it", async () => {
    const fixture = await createOrder();
    const rejectedRequest = vi.fn().mockResolvedValue({ code: 0, msg: "provider rejected" });
    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment: rejectedRequest },
      ),
    ).rejects.toThrow("provider rejected");

    const transaction = await db.paymentTransaction.findUniqueOrThrow({
      where: { orderId: fixture.order.id },
    });
    expect(transaction.status).toBe("failed");
    expect(transaction.rawResponse).toEqual({
      requestVersion: "paid-download-v3",
      creationState: "failed",
      requestType: "wxpay",
      requestOrderNo: fixture.order.orderNo,
      requestAmount: "19.90",
    });
    const retryRequest = vi.fn().mockResolvedValue({ code: 1 });

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment: retryRequest },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED");
    expect(rejectedRequest).toHaveBeenCalledTimes(1);
    expect(retryRequest).not.toHaveBeenCalled();
    expect((await db.order.findUniqueOrThrow({ where: { id: fixture.order.id } })).orderNo).toBe(
      fixture.order.orderNo,
    );
  }, 30_000);

  it("moves only a stale matching dispatch to ambiguous without contacting the provider", async () => {
    const fixture = await createOrder();
    const now = new Date();
    await db.paymentTransaction.create({
      data: {
        orderId: fixture.order.id,
        provider: "zpay",
        paymentType: "wxpay",
        status: "pending",
        amount: fixture.order.amount,
        updatedAt: new Date(now.getTime() - 16 * 60 * 1_000),
        rawResponse: {
          requestVersion: "paid-download-v3",
          creationState: "dispatching",
          requestType: "wxpay",
          requestOrderNo: fixture.order.orderNo,
          requestAmount: "19.90",
        },
      },
    });
    const requestPayment = vi.fn();

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment, now: () => now },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED");
    expect(requestPayment).not.toHaveBeenCalled();
    expect(
      (await db.paymentTransaction.findUniqueOrThrow({ where: { orderId: fixture.order.id } }))
        .rawResponse,
    ).toEqual({
      requestVersion: "paid-download-v3",
      creationState: "ambiguous",
      requestType: "wxpay",
      requestOrderNo: fixture.order.orderNo,
      requestAmount: "19.90",
    });

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment, now: () => now },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_RECONCILIATION_REQUIRED");
    expect(requestPayment).not.toHaveBeenCalled();
  }, 30_000);

  it("surfaces a stable error when conditional ambiguous persistence matches no dispatch", async () => {
    const fixture = await createOrder();
    const providerError = new Error("provider response lost");
    const requestPayment = vi.fn(async () => {
      await db.paymentTransaction.update({
        where: { orderId: fixture.order.id },
        data: {
          rawResponse: {
            requestVersion: "paid-download-v3",
            creationState: "dispatching",
            requestType: "wxpay",
            requestOrderNo: "TASK6-TAMPERED-DISPATCH",
            requestAmount: "19.90",
          },
        },
      });
      throw providerError;
    });

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment },
      ),
    ).rejects.toMatchObject({
      message: "ZPAY_PAYMENT_CREATION_STATE_PERSIST_FAILED",
    });
    expect(requestPayment).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("surfaces a stable error when the ambiguous persistence transaction fails", async () => {
    const fixture = await createOrder();
    const providerError = new Error("provider connection failed");
    const persistenceError = new Error("test transaction unavailable");
    const requestPayment = vi.fn().mockRejectedValue(providerError);
    const realTransaction = db.$transaction.bind(db);
    let transactionCalls = 0;
    const failingDb = new Proxy(db, {
      get(target, property) {
        if (property === "$transaction") {
          return (...args: unknown[]) => {
            transactionCalls += 1;
            if (transactionCalls === 2) return Promise.reject(persistenceError);
            return (realTransaction as (...transactionArgs: unknown[]) => unknown)(...args);
          };
        }
        return Reflect.get(target, property, target);
      },
    });

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db: failingDb, config, requestPayment },
      ),
    ).rejects.toMatchObject({
      message: "ZPAY_PAYMENT_CREATION_STATE_PERSIST_FAILED",
      cause: persistenceError,
    });
    expect(requestPayment).toHaveBeenCalledTimes(1);
    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_IN_PROGRESS");
    expect(requestPayment).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("surfaces a stable error when a successful provider response cannot be persisted", async () => {
    const fixture = await createOrder();
    const persistenceError = new Error("test success persistence unavailable");
    const requestPayment = vi.fn().mockResolvedValue({
      code: 1,
      trade_no: `provider-${randomUUID()}`,
      qrcode: "https://pay.example.test/persist-failed",
    });
    const realTransaction = db.$transaction.bind(db);
    let transactionCalls = 0;
    const failingDb = new Proxy(db, {
      get(target, property) {
        if (property === "$transaction") {
          return (...args: unknown[]) => {
            transactionCalls += 1;
            if (transactionCalls === 2) return Promise.reject(persistenceError);
            return (realTransaction as (...transactionArgs: unknown[]) => unknown)(...args);
          };
        }
        return Reflect.get(target, property, target);
      },
    });

    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db: failingDb, config, requestPayment },
      ),
    ).rejects.toMatchObject({
      message: "ZPAY_PAYMENT_CREATION_STATE_PERSIST_FAILED",
      cause: persistenceError,
    });
    expect(requestPayment).toHaveBeenCalledTimes(1);

    const retryRequest = vi.fn().mockResolvedValue({ code: 1 });
    await expect(
      ensureZpayPaymentForOrder(
        { orderId: fixture.order.id },
        { db, config, requestPayment: retryRequest },
      ),
    ).rejects.toThrow("ZPAY_PAYMENT_CREATION_IN_PROGRESS");
    expect(retryRequest).not.toHaveBeenCalled();
  }, 30_000);

  it("returns a paid callback view when the external request later throws", async () => {
    const fixture = await createOrder();
    const providerError = new Error("response lost after callback");
    const requestPayment = vi.fn(async () => {
      const payload = buildZpaySignedParams(
        {
          pid: config.pid,
          money: "19.90",
          out_trade_no: fixture.order.orderNo,
          trade_no: `callback-${randomUUID()}`,
          param: fixture.order.id,
          trade_status: "TRADE_SUCCESS",
          type: "wxpay",
        },
        config.key,
      );
      await activateOrderFromZpayNotify(payload, { db, config });
      throw providerError;
    });

    const result = await ensureZpayPaymentForOrder(
      { orderId: fixture.order.id },
      { db, config, requestPayment },
    );
    expect(result.transaction.status).toBe("paid");
    expect(requestPayment).toHaveBeenCalledTimes(1);
  }, 30_000);

  it("rejects an old signed callback after an earlier queued admin price change commits", async () => {
    const fixture = await createOrder("19.90");
    const applicationNames = {
      blocker: `t6-zpay-callback-${randomUUID()}-blocker`,
      updater: `t6-zpay-callback-${randomUUID()}-updater`,
      callback: `t6-zpay-callback-${randomUUID()}-callback`,
      observer: `t6-zpay-callback-${randomUUID()}-observer`,
    };
    const blockerDb = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.blocker),
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    const updaterDb = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.updater),
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    const callbackDb = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.callback),
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    const observerDb = new PrismaClient({
      datasourceUrl: withApplicationName(applicationNames.observer),
    });
    const locked = createDeferred();
    const release = createDeferred();
    const blocker = blockerDb.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orders WHERE id = ${fixture.order.id} FOR UPDATE`);
      locked.resolve(undefined);
      await release.promise;
    });
    void blocker.catch(locked.reject);

    const waitForBlockedOrderLock = async (applicationName: string) => {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const rows = await observerDb.$queryRaw<
          Array<{
            applicationName: string;
            waitEventType: string | null;
            hasUngrantedLock: boolean;
          }>
        >(Prisma.sql`
          SELECT
            activity.application_name AS "applicationName",
            activity.wait_event_type AS "waitEventType",
            BOOL_OR(NOT locks.granted) AS "hasUngrantedLock"
          FROM pg_stat_activity AS activity
          INNER JOIN pg_locks AS locks ON locks.pid = activity.pid
          WHERE activity.datname = current_database()
            AND activity.application_name = ${applicationName}
            AND activity.state = 'active'
            AND activity.query ILIKE '%FOR UPDATE%'
          GROUP BY activity.pid, activity.application_name, activity.wait_event_type
          HAVING BOOL_OR(NOT locks.granted)
        `);
        if (rows.length) {
          expect(rows[0]).toMatchObject({
            applicationName,
            waitEventType: "Lock",
            hasUngrantedLock: true,
          });
          return;
        }
        await delay(25);
      }
      throw new Error(`Timed out waiting for blocked order lock: ${applicationName}`);
    };

    let updater: Promise<unknown> | undefined;
    let callback: Promise<Awaited<ReturnType<typeof activateOrderFromZpayNotify>>> | undefined;
    try {
      await locked.promise;
      updater = updateOrderForAdmin({
        db: updaterDb,
        orderId: fixture.order.id,
        adminId: fixture.user.id,
        amount: 39.9,
        paymentMethod: "wechat",
        orderStatus: "pending_payment",
        auditContext: { ip: "127.0.0.1", userAgent: "task6-zpay-test" },
      });
      await waitForBlockedOrderLock(applicationNames.updater);

      const payload = buildZpaySignedParams(
        {
          pid: config.pid,
          money: "19.90",
          out_trade_no: fixture.order.orderNo,
          trade_no: `callback-${randomUUID()}`,
          param: fixture.order.id,
          trade_status: "TRADE_SUCCESS",
          type: "wxpay",
        },
        config.key,
      );
      callback = activateOrderFromZpayNotify(payload, { db: callbackDb, config });
      await waitForBlockedOrderLock(applicationNames.callback);

      release.resolve(undefined);
      await updater;
      await expect(callback).resolves.toEqual({
        ok: false,
        response: "amount-mismatch",
        status: 400,
      });

      await expect(
        db.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      ).resolves.toMatchObject({ amount: expect.anything(), orderStatus: "pending_payment" });
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: fixture.order.id } })).amount.equals("39.90"),
      ).toBe(true);
      await expect(
        db.paymentTransaction.findUnique({ where: { orderId: fixture.order.id } }),
      ).resolves.toBeNull();
      await expect(
        db.seoAuditCredit.findUnique({ where: { orderId: fixture.order.id } }),
      ).resolves.toBeNull();
    } finally {
      release.resolve(undefined);
      await Promise.allSettled([blocker, updater, callback].filter(Boolean));
      await Promise.all([
        blockerDb.$disconnect(),
        updaterDb.$disconnect(),
        callbackDb.$disconnect(),
        observerDb.$disconnect(),
      ]);
    }
  }, 30_000);
});
