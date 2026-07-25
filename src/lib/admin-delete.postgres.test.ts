import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deleteOrderForAdmin,
  deleteToolForAdmin,
  deleteUserForAdmin,
} from "@/lib/admin-delete";

const databaseUrl = process.env.SEO_AUDIT_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;
const auditContext = { ip: "127.0.0.1", userAgent: "vitest" };
const guardTable = "admin_delete_user_guards";

describePostgres("PostgreSQL admin hard-delete protection", () => {
  let db: PrismaClient;
  let concurrentDb: PrismaClient;
  let adminId: string;
  const prefix = `task9-${process.pid}-${Date.now()}`;

  beforeAll(async () => {
    db = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    concurrentDb = new PrismaClient({
      datasourceUrl: databaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 30_000 },
    });
    const admin = await db.user.create({
      data: {
        email: `${prefix}-admin@example.test`,
        passwordHash: "integration-test",
        role: "admin",
      },
    });
    adminId = admin.id;

    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${guardTable}"`);
    await db.$executeRawUnsafe(
      `CREATE TABLE "${guardTable}" ("user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE RESTRICT)`,
    );
  });

  afterAll(async () => {
    if (db) {
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${guardTable}"`);
      await db.adminAuditLog.deleteMany({ where: { adminId } });
      await db.user.deleteMany({ where: { id: adminId } });
    }
    await Promise.all([db?.$disconnect(), concurrentDb?.$disconnect()]);
  });

  it("retains payment, report, and purchase evidence when order deletion is requested", async () => {
    const user = await createUser(true);
    const tool = await createTool();
    const paidOrder = await createOrder(user.id, {
      orderStatus: "paid",
      isTestData: true,
    });
    const reportOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const purchaseOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
      toolId: tool.id,
    });
    const payment = await db.paymentTransaction.create({
      data: {
        orderId: paidOrder.id,
        paymentType: "alipay",
        amount: "9.90",
      },
    });
    const report = await db.seoAuditRun.create({
      data: {
        userId: user.id,
        sourceOrderId: reportOrder.id,
        kind: "free",
        targetUrl: "https://protected-report.example/",
        normalizedOrigin: "https://protected-report.example",
        pageLimit: 10,
        totalTimeoutSeconds: 720,
      },
    });
    const purchase = await db.toolPurchase.create({
      data: {
        userId: user.id,
        toolId: tool.id,
        orderId: purchaseOrder.id,
        amount: "19.90",
      },
    });

    try {
      const results = await Promise.all(
        [paidOrder.id, reportOrder.id, purchaseOrder.id].map((orderId) =>
          deleteOrderForAdmin({
            db,
            orderId,
            adminId,
            auditContext,
          }),
        ),
      );

      expect(results).toEqual([
        { status: "blocked", code: "ADMIN_ORDER_DELETE_PROTECTED_RECORDS" },
        { status: "blocked", code: "ADMIN_ORDER_DELETE_PROTECTED_RECORDS" },
        { status: "blocked", code: "ADMIN_ORDER_DELETE_PROTECTED_RECORDS" },
      ]);
      expect(
        await db.order.count({
          where: { id: { in: [paidOrder.id, reportOrder.id, purchaseOrder.id] } },
        }),
      ).toBe(3);
      expect(await db.paymentTransaction.findUnique({ where: { id: payment.id } })).not.toBeNull();
      expect(await db.seoAuditRun.findUnique({ where: { id: report.id } })).not.toBeNull();
      expect(await db.toolPurchase.findUnique({ where: { id: purchase.id } })).not.toBeNull();
    } finally {
      await db.seoAuditRun.deleteMany({ where: { id: report.id } });
      await db.toolPurchase.deleteMany({ where: { id: purchase.id } });
      await db.paymentTransaction.deleteMany({ where: { id: payment.id } });
      await db.order.deleteMany({
        where: { id: { in: [paidOrder.id, reportOrder.id, purchaseOrder.id] } },
      });
      await db.tool.deleteMany({ where: { id: tool.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it("rejects non-test orders and disables non-test users", async () => {
    const user = await createUser(false);
    const order = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: false,
    });

    try {
      expect(
        await deleteOrderForAdmin({
          db,
          orderId: order.id,
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_ORDER_DELETE_NOT_TEST_DATA",
      });

      await db.order.delete({ where: { id: order.id } });
      expect(
        await deleteUserForAdmin({
          db,
          userId: user.id,
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_USER_DELETE_NOT_TEST_DATA",
        disabled: true,
      });
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("disabled");
    } finally {
      await db.order.deleteMany({ where: { id: order.id } });
      await db.adminAuditLog.deleteMany({ where: { targetId: user.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it(
    "locks the order row and re-reads a concurrently committed status before deletion",
    async () => {
      const user = await createUser(true);
      const order = await createOrder(user.id, {
        orderStatus: "cancelled",
        isTestData: true,
      });
      const rowLocked = deferred<void>();
      const releaseUpdate = deferred<void>();
      const update = concurrentDb.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(
          'SELECT "id" FROM "orders" WHERE "id" = $1 FOR UPDATE',
          order.id,
        );
        await tx.order.update({
          where: { id: order.id },
          data: { orderStatus: "paid" },
        });
        rowLocked.resolve();
        await releaseUpdate.promise;
      });

      try {
        await rowLocked.promise;
        const deletion = deleteOrderForAdmin({
          db,
          orderId: order.id,
          adminId,
          auditContext,
        });
        expect(
          await Promise.race([
            deletion.then(() => "resolved"),
            wait(100).then(() => "waiting"),
          ]),
        ).toBe("waiting");

        releaseUpdate.resolve();
        await update;
        expect(await deletion).toEqual({
          status: "blocked",
          code: "ADMIN_ORDER_DELETE_NOT_CANCELLED",
        });
        expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).orderStatus).toBe("paid");
      } finally {
        releaseUpdate.resolve();
        await update.catch(() => undefined);
        await db.order.deleteMany({ where: { id: order.id } });
        await db.user.deleteMany({ where: { id: user.id } });
      }
    },
    30_000,
  );

  it("disables a protected user without nulling report ownership", async () => {
    const user = await createUser(true);
    const report = await db.seoAuditRun.create({
      data: {
        userId: user.id,
        kind: "free",
        targetUrl: "https://protected-user.example/",
        normalizedOrigin: "https://protected-user.example",
        pageLimit: 10,
        totalTimeoutSeconds: 720,
      },
    });

    try {
      expect(
        await deleteUserForAdmin({
          db,
          userId: user.id,
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_USER_DELETE_PROTECTED_RECORDS",
        disabled: true,
      });
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("disabled");
      expect((await db.seoAuditRun.findUniqueOrThrow({ where: { id: report.id } })).userId).toBe(user.id);
      expect(
        await db.adminAuditLog.count({
          where: {
            targetId: user.id,
            action: "user.delete.protected_disabled",
          },
        }),
      ).toBe(1);
    } finally {
      await db.seoAuditRun.deleteMany({ where: { id: report.id } });
      await db.adminAuditLog.deleteMany({ where: { targetId: user.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it(
    "disables the user when a concurrent foreign-key insert makes deletion conflict",
    async () => {
      const user = await createUser(true);
      const guardInserted = deferred<void>();
      const releaseGuard = deferred<void>();
      const guardWrite = concurrentDb.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO "${guardTable}" ("user_id") VALUES ($1)`,
          user.id,
        );
        guardInserted.resolve();
        await releaseGuard.promise;
      });

      try {
        await guardInserted.promise;
        const deletion = deleteUserForAdmin({
          db,
          userId: user.id,
          adminId,
          auditContext,
        });
        expect(
          await Promise.race([
            deletion.then(() => "resolved"),
            wait(100).then(() => "waiting"),
          ]),
        ).toBe("waiting");

        releaseGuard.resolve();
        await guardWrite;
        expect(await deletion).toEqual({
          status: "blocked",
          code: "ADMIN_DELETE_CONFLICT",
          disabled: true,
        });
        expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("disabled");
        expect(
          await db.$queryRawUnsafe<Array<{ user_id: string }>>(
            `SELECT "user_id" FROM "${guardTable}" WHERE "user_id" = $1`,
            user.id,
          ),
        ).toEqual([{ user_id: user.id }]);
      } finally {
        releaseGuard.resolve();
        await guardWrite.catch(() => undefined);
        await db.$executeRawUnsafe(
          `DELETE FROM "${guardTable}" WHERE "user_id" = $1`,
          user.id,
        );
        await db.adminAuditLog.deleteMany({ where: { targetId: user.id } });
        await db.user.deleteMany({ where: { id: user.id } });
      }
    },
    30_000,
  );

  it("rolls back deletion when the in-transaction audit insert fails", async () => {
    const user = await createUser(true);
    const order = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });

    try {
      await expect(
        deleteOrderForAdmin({
          db,
          orderId: order.id,
          adminId: `${prefix}-missing-admin`,
          auditContext,
        }),
      ).rejects.toMatchObject({ code: "P2003" });
      expect(await db.order.findUnique({ where: { id: order.id } })).not.toBeNull();
    } finally {
      await db.order.deleteMany({ where: { id: order.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it("refuses tools with direct orders, price-spec orders, or purchases without unlinking evidence", async () => {
    const user = await createUser(true);
    const orderedTool = await createTool();
    const pricedTool = await createTool();
    const purchasedTool = await createTool();
    const priceSpec = await db.toolPriceSpec.create({
      data: {
        toolId: pricedTool.id,
        name: "Protected price spec",
        price: "9.90",
      },
    });
    const toolOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
      toolId: orderedTool.id,
    });
    const priceSpecOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
      toolPriceSpecId: priceSpec.id,
    });
    const purchaseOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const purchase = await db.toolPurchase.create({
      data: {
        userId: user.id,
        toolId: purchasedTool.id,
        orderId: purchaseOrder.id,
        amount: "19.90",
      },
    });

    try {
      expect(
        await deleteToolForAdmin({
          db,
          toolId: orderedTool.id,
          toolType: "software",
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_TOOL_DELETE_PROTECTED_RECORDS",
      });
      expect(
        await deleteToolForAdmin({
          db,
          toolId: pricedTool.id,
          toolType: "software",
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_TOOL_DELETE_PROTECTED_RECORDS",
      });
      expect(
        await deleteToolForAdmin({
          db,
          toolId: purchasedTool.id,
          toolType: "software",
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_TOOL_DELETE_PROTECTED_RECORDS",
      });
      expect((await db.order.findUniqueOrThrow({ where: { id: toolOrder.id } })).toolId).toBe(orderedTool.id);
      expect((await db.order.findUniqueOrThrow({ where: { id: priceSpecOrder.id } })).toolPriceSpecId).toBe(priceSpec.id);
      expect((await db.toolPurchase.findUniqueOrThrow({ where: { id: purchase.id } })).toolId).toBe(purchasedTool.id);
    } finally {
      await db.toolPurchase.deleteMany({ where: { id: purchase.id } });
      await db.order.deleteMany({ where: { id: { in: [toolOrder.id, priceSpecOrder.id, purchaseOrder.id] } } });
      await db.tool.deleteMany({ where: { id: { in: [orderedTool.id, pricedTool.id, purchasedTool.id] } } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it("writes successful user, order, and tool deletion audits in their transactions", async () => {
    const owner = await createUser(true);
    const emptyUser = await createUser(true);
    const order = await createOrder(owner.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const tool = await createTool();

    try {
      expect(
        await deleteOrderForAdmin({
          db,
          orderId: order.id,
          adminId,
          auditContext,
        }),
      ).toMatchObject({ status: "deleted" });
      expect(
        await deleteUserForAdmin({
          db,
          userId: emptyUser.id,
          adminId,
          auditContext,
        }),
      ).toMatchObject({ status: "deleted" });
      expect(
        await deleteToolForAdmin({
          db,
          toolId: tool.id,
          toolType: "software",
          adminId,
          auditContext,
        }),
      ).toMatchObject({ status: "deleted" });

      expect(
        await db.adminAuditLog.count({
          where: {
            OR: [
              { action: "order.delete", targetId: order.id },
              { action: "user.delete", targetId: emptyUser.id },
              { action: "tool.delete", targetId: tool.id },
            ],
          },
        }),
      ).toBe(3);
    } finally {
      await db.adminAuditLog.deleteMany({
        where: { targetId: { in: [order.id, emptyUser.id, tool.id] } },
      });
      await db.order.deleteMany({ where: { id: order.id } });
      await db.tool.deleteMany({ where: { id: tool.id } });
      await db.user.deleteMany({ where: { id: { in: [owner.id, emptyUser.id] } } });
    }
  }, 30_000);

  async function createUser(isTestData: boolean) {
    return db.user.create({
      data: {
        email: `${prefix}-${randomUUID()}@example.test`,
        passwordHash: "integration-test",
        isTestData,
      },
    });
  }

  async function createTool() {
    const suffix = randomUUID();
    return db.tool.create({
      data: {
        name: `Task 9 Tool ${suffix}`,
        slug: `${prefix}-${suffix}`,
        type: "software",
        shortDescription: "integration test",
        content: "integration test",
      },
    });
  }

  async function createOrder(
    userId: string,
    data: {
      orderStatus: "cancelled" | "paid";
      isTestData: boolean;
      toolId?: string;
      toolPriceSpecId?: string;
    },
  ) {
    return db.order.create({
      data: {
        orderNo: `${prefix}-${randomUUID()}`,
        userId,
        toolId: data.toolId,
        toolPriceSpecId: data.toolPriceSpecId,
        amount: "9.90",
        orderStatus: data.orderStatus,
        isTestData: data.isTestData,
      },
    });
  }
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
