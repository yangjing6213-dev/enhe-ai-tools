import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
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
const root = process.cwd();
const installMigrationName =
  "20260725182500_protect_financial_audit_records";
const validationMigrationName =
  "20260725182600_validate_financial_audit_restrict_fks";
const finalizationMigrationName =
  "20260725182700_finalize_financial_audit_restrict_fks";
const task9MigrationNames = [
  installMigrationName,
  validationMigrationName,
  finalizationMigrationName,
] as const;
type Task9MigrationName = (typeof task9MigrationNames)[number];
const migrationsRoot = join(root, "prisma", "migrations");
const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");
const execFileAsync = promisify(execFile);
const protectedForeignKeys = [
  "payment_transactions_order_id_fkey",
  "order_refund_records_order_id_fkey",
  "seo_audit_runs_source_order_id_fkey",
  "seo_audit_runs_user_id_fkey",
  "orders_tool_id_fkey",
] as const;
const temporaryGuardTriggers = [
  "task9_guard_order_evidence_delete",
  "task9_guard_user_report_delete",
  "task9_guard_tool_order_delete",
] as const;
const temporaryGuardFunctions = [
  "task9_guard_order_evidence_delete_fn",
  "task9_guard_user_report_delete_fn",
  "task9_guard_tool_order_delete_fn",
] as const;

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

  it("retains payment proof, refund, credit, and monitoring subscription evidence", async () => {
    const user = await createUser(true);
    const offer = await db.seoAuditOffer.create({
      data: {
        code: `${prefix}-${randomUUID()}`,
        name: "Task 9 protected evidence",
        orderType: "seo_audit_credit",
        regularPrice: "99.00",
        pageLimit: 10,
        validityDays: 30,
      },
    });
    const project = await db.seoAuditProject.create({
      data: {
        userId: user.id,
        normalizedOrigin: `https://${randomUUID()}.example`,
      },
    });
    const subscription = await db.seoAuditSubscription.create({
      data: {
        userId: user.id,
        projectId: project.id,
        offerId: offer.id,
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
        maxScheduledRuns: 4,
        manualRunsRemaining: 1,
      },
    });
    const proofOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const refundOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const creditOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const subscriptionOrder = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const proof = await db.paymentProof.create({
      data: {
        orderId: proofOrder.id,
        userId: user.id,
        paymentMethod: "alipay",
        proofImage: "/task9/proof.png",
      },
    });
    const refund = await db.orderRefundRecord.create({
      data: {
        orderId: refundOrder.id,
        adminId,
        requesterId: user.id,
        amount: "9.90",
        reason: "Task 9 protected refund",
      },
    });
    const credit = await db.seoAuditCredit.create({
      data: {
        userId: user.id,
        offerId: offer.id,
        orderId: creditOrder.id,
        runKind: "professional",
        pageLimit: 10,
        totalRuns: 1,
        remainingRuns: 1,
        expiresAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    });
    const monitoringOrder = await db.seoAuditSubscriptionOrder.create({
      data: {
        subscriptionId: subscription.id,
        orderId: subscriptionOrder.id,
        serviceStartsAt: new Date("2026-07-01T00:00:00.000Z"),
        serviceEndsAt: new Date("2026-08-01T00:00:00.000Z"),
        scheduledRunsGranted: 4,
        manualRunsGranted: 1,
      },
    });
    const orderIds = [
      proofOrder.id,
      refundOrder.id,
      creditOrder.id,
      subscriptionOrder.id,
    ];

    try {
      for (const orderId of orderIds) {
        expect(
          await deleteOrderForAdmin({
            db,
            orderId,
            adminId,
            auditContext,
          }),
        ).toEqual({
          status: "blocked",
          code: "ADMIN_ORDER_DELETE_PROTECTED_RECORDS",
        });
      }

      expect(await db.order.count({ where: { id: { in: orderIds } } })).toBe(4);
      expect(await db.paymentProof.findUnique({ where: { id: proof.id } })).not.toBeNull();
      expect(await db.orderRefundRecord.findUnique({ where: { id: refund.id } })).not.toBeNull();
      expect(await db.seoAuditCredit.findUnique({ where: { id: credit.id } })).not.toBeNull();
      expect(
        await db.seoAuditSubscriptionOrder.findUnique({
          where: { id: monitoringOrder.id },
        }),
      ).not.toBeNull();
    } finally {
      await db.seoAuditSubscriptionOrder.deleteMany({ where: { id: monitoringOrder.id } });
      await db.seoAuditCredit.deleteMany({ where: { id: credit.id } });
      await db.orderRefundRecord.deleteMany({ where: { id: refund.id } });
      await db.paymentProof.deleteMany({ where: { id: proof.id } });
      await db.seoAuditSubscription.deleteMany({ where: { id: subscription.id } });
      await db.seoAuditProject.deleteMany({ where: { id: project.id } });
      await db.order.deleteMany({ where: { id: { in: orderIds } } });
      await db.seoAuditOffer.deleteMany({ where: { id: offer.id } });
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

  it("disables a cross-user audit operator without nulling audit or VIP ownership", async () => {
    const operator = await createUser(true);
    const beneficiary = await createUser(true);
    const audit = await db.adminAuditLog.create({
      data: {
        adminId: operator.id,
        action: "user.cross-account-review",
        targetType: "user",
        targetId: beneficiary.id,
        summary: "Task 9 cross-user audit evidence",
      },
    });
    const adjustment = await db.vipAdjustmentLog.create({
      data: {
        userId: beneficiary.id,
        adminId: operator.id,
        actionType: "extend",
        reason: "Task 9 cross-user VIP evidence",
      },
    });

    try {
      expect(
        await deleteUserForAdmin({
          db,
          userId: operator.id,
          adminId,
          auditContext,
        }),
      ).toEqual({
        status: "blocked",
        code: "ADMIN_USER_DELETE_PROTECTED_RECORDS",
        disabled: true,
      });
      expect((await db.user.findUniqueOrThrow({ where: { id: operator.id } })).status).toBe("disabled");
      expect((await db.adminAuditLog.findUniqueOrThrow({ where: { id: audit.id } })).adminId).toBe(operator.id);
      expect((await db.vipAdjustmentLog.findUniqueOrThrow({ where: { id: adjustment.id } })).adminId).toBe(operator.id);
    } finally {
      await db.vipAdjustmentLog.deleteMany({ where: { id: adjustment.id } });
      await db.adminAuditLog.deleteMany({
        where: { OR: [{ id: audit.id }, { targetId: operator.id }] },
      });
      await db.user.deleteMany({
        where: { id: { in: [operator.id, beneficiary.id] } },
      });
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
      await db.toolPriceSpec.deleteMany({ where: { id: priceSpec.id } });
      await db.tool.deleteMany({ where: { id: { in: [orderedTool.id, pricedTool.id, purchasedTool.id] } } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it("blocks direct tool deletion when an order is linked only through a price spec", async () => {
    const user = await createUser(true);
    const tool = await createTool();
    const priceSpec = await db.toolPriceSpec.create({
      data: {
        toolId: tool.id,
        name: "Database protected price spec",
        price: "9.90",
      },
    });
    const order = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
      toolPriceSpecId: priceSpec.id,
    });

    try {
      await expect(db.tool.delete({ where: { id: tool.id } })).rejects.toBeDefined();
      expect(await db.tool.findUnique({ where: { id: tool.id } })).not.toBeNull();
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: order.id } }))
          .toolPriceSpecId,
      ).toBe(priceSpec.id);
    } finally {
      await db.order.deleteMany({ where: { id: order.id } });
      await db.toolPriceSpec.deleteMany({ where: { id: priceSpec.id } });
      await db.tool.deleteMany({ where: { id: tool.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it("blocks direct price-spec deletion when only a purchase references it", async () => {
    const user = await createUser(true);
    const tool = await createTool();
    const priceSpec = await db.toolPriceSpec.create({
      data: {
        toolId: tool.id,
        name: "Purchase protected price spec",
        price: "19.90",
      },
    });
    const order = await createOrder(user.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const purchase = await db.toolPurchase.create({
      data: {
        userId: user.id,
        toolId: tool.id,
        toolPriceSpecId: priceSpec.id,
        toolPriceSpecName: priceSpec.name,
        orderId: order.id,
        amount: "19.90",
      },
    });

    try {
      await expect(
        db.toolPriceSpec.delete({ where: { id: priceSpec.id } }),
      ).rejects.toBeDefined();
      expect(
        (
          await db.toolPurchase.findUniqueOrThrow({
            where: { id: purchase.id },
          })
        ).toolPriceSpecId,
      ).toBe(priceSpec.id);
    } finally {
      await db.toolPurchase.deleteMany({ where: { id: purchase.id } });
      await db.order.deleteMany({ where: { id: order.id } });
      await db.toolPriceSpec.deleteMany({ where: { id: priceSpec.id } });
      await db.tool.deleteMany({ where: { id: tool.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  }, 30_000);

  it("applies all three Task 9 migration phases to the final protected state", async () => {
    const harness = await createMigrationHarness(db, databaseUrl!);

    try {
      const evidence = await seedMigrationPaymentEvidence(harness.client, 1);
      await harness.installTask9Migrations();
      await runMigrateDeploy(harness.schemaPath, harness.databaseUrl);
      await expectFinalMigrationState({
        client: harness.client,
        schemaName: harness.schemaName,
        orderId: evidence.orderId,
      });
    } finally {
      await harness.cleanup();
    }
  }, 120_000);

  it(
    "resolves and reruns the final phase after its FK swap hits lock_timeout",
    async () => {
      const harness = await createMigrationHarness(db, databaseUrl!);
      const releaseLock = deferred<void>();
      const lockAcquired = deferred<void>();
      let blocker: Promise<unknown> | undefined;

      try {
        const evidence = await seedMigrationPaymentEvidence(harness.client, 1);
        await harness.installTask9Migrations();
        blocker = harness.client.$transaction(async (tx) => {
          await tx.$queryRawUnsafe(
            'SELECT "id" FROM "payment_transactions" WHERE "id" = $1',
            evidence.paymentId,
          );
          lockAcquired.resolve();
          await releaseLock.promise;
        });
        await lockAcquired.promise;

        const failure = await runMigrateDeployExpectingFailure(
          harness.schemaPath,
          harness.databaseUrl,
        );
        expect(failure.output).toMatch(
          /lock timeout|55P03|current transaction is aborted/i,
        );
        expect(failure.elapsedMs).toBeGreaterThanOrEqual(4_000);
        expect(failure.elapsedMs).toBeLessThan(20_000);

        releaseLock.resolve();
        await blocker;
        await expectIntermediateMigrationProtection({
          client: harness.client,
          schemaName: harness.schemaName,
          orderId: evidence.orderId,
          expectAllValidated: true,
        });

        await runMigrateResolve(
          harness.schemaPath,
          harness.databaseUrl,
          finalizationMigrationName,
        );
        await runMigrateDeploy(harness.schemaPath, harness.databaseUrl);
        await expectFinalMigrationState({
          client: harness.client,
          schemaName: harness.schemaName,
          orderId: evidence.orderId,
        });
      } finally {
        releaseLock.resolve();
        await blocker?.catch(() => undefined);
        await harness.cleanup();
      }
    },
    120_000,
  );

  it(
    "resolves and reruns validation after its transaction hits statement_timeout",
    async () => {
      const harness = await createMigrationHarness(db, databaseUrl!);

      try {
        const evidence = await seedMigrationPaymentEvidence(
          harness.client,
          25_000,
        );
        await harness.installTask9Migrations({
          [validationMigrationName]: (migration) =>
            migration.replace(
              "SET LOCAL statement_timeout = '10min';",
              "SET LOCAL statement_timeout = '1ms';",
            ),
        });

        const failure = await runMigrateDeployExpectingFailure(
          harness.schemaPath,
          harness.databaseUrl,
        );
        expect(failure.output).toMatch(
          /statement timeout|57014|current transaction is aborted/i,
        );
        expect(failure.elapsedMs).toBeLessThan(30_000);
        await expectIntermediateMigrationProtection({
          client: harness.client,
          schemaName: harness.schemaName,
          orderId: evidence.orderId,
          expectAllValidated: false,
        });

        await runMigrateResolve(
          harness.schemaPath,
          harness.databaseUrl,
          validationMigrationName,
        );
        await harness.installTask9Migrations();
        await runMigrateDeploy(harness.schemaPath, harness.databaseUrl);
        await expectFinalMigrationState({
          client: harness.client,
          schemaName: harness.schemaName,
          orderId: evidence.orderId,
        });
      } finally {
        await harness.cleanup();
      }
    },
    120_000,
  );

  it("writes successful user, order, and tool deletion audits in their transactions", async () => {
    const owner = await createUser(true);
    const emptyUser = await createUser(true);
    const order = await createOrder(owner.id, {
      orderStatus: "cancelled",
      isTestData: true,
    });
    const tool = await createTool();
    const unusedPriceSpec = await db.toolPriceSpec.create({
      data: {
        toolId: tool.id,
        name: "Unused price spec",
        price: "9.90",
      },
    });

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
        await db.toolPriceSpec.findUnique({ where: { id: unusedPriceSpec.id } }),
      ).toBeNull();

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
      await db.toolPriceSpec.deleteMany({ where: { id: unusedPriceSpec.id } });
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

async function createMigrationHarness(
  controlDb: PrismaClient,
  sourceDatabaseUrl: string,
) {
  const schemaName = `task9_migration_${randomUUID().replaceAll("-", "")}`;
  const tempRoot = await mkdtemp(join(tmpdir(), "task9-prisma-"));
  const prismaRoot = join(tempRoot, "prisma");
  const tempMigrationsRoot = join(prismaRoot, "migrations");
  const schemaPath = join(prismaRoot, "schema.prisma");
  const scopedDatabaseUrl = databaseUrlForSchema(sourceDatabaseUrl, schemaName);
  let client: PrismaClient | undefined;

  try {
    await mkdir(tempMigrationsRoot, { recursive: true });
    await copyFile(join(root, "prisma", "schema.prisma"), schemaPath);
    await copyFile(
      join(migrationsRoot, "migration_lock.toml"),
      join(tempMigrationsRoot, "migration_lock.toml"),
    );
    for (const entry of await readdir(migrationsRoot, {
      withFileTypes: true,
    })) {
      if (
        !entry.isDirectory() ||
        task9MigrationNames.includes(entry.name as Task9MigrationName)
      ) {
        continue;
      }
      await cp(
        join(migrationsRoot, entry.name),
        join(tempMigrationsRoot, entry.name),
        { recursive: true },
      );
    }

    await controlDb.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
    await runMigrateDeploy(schemaPath, scopedDatabaseUrl);
    client = new PrismaClient({
      datasourceUrl: scopedDatabaseUrl,
      transactionOptions: { maxWait: 10_000, timeout: 60_000 },
    });

    return {
      client,
      databaseUrl: scopedDatabaseUrl,
      schemaName,
      schemaPath,
      async installTask9Migrations(
        transforms: Partial<
          Record<Task9MigrationName, (migration: string) => string>
        > = {},
      ) {
        for (const migrationName of task9MigrationNames) {
          const target = join(tempMigrationsRoot, migrationName);
          await mkdir(target, { recursive: true });
          const migration = await readFile(
            join(migrationsRoot, migrationName, "migration.sql"),
            "utf8",
          );
          await writeFile(
            join(target, "migration.sql"),
            transforms[migrationName]?.(migration) ?? migration,
          );
        }
      },
      async cleanup() {
        await client?.$disconnect();
        await controlDb.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
        );
        await rm(tempRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await client?.$disconnect();
    await controlDb
      .$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
      .catch(() => undefined);
    await rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

async function runMigrateDeploy(schemaPath: string, scopedDatabaseUrl: string) {
  return execFileAsync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", schemaPath],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: scopedDatabaseUrl },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    },
  );
}

async function runMigrateResolve(
  schemaPath: string,
  scopedDatabaseUrl: string,
  migrationName: Task9MigrationName,
) {
  return execFileAsync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "resolve",
      "--rolled-back",
      migrationName,
      "--schema",
      schemaPath,
    ],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: scopedDatabaseUrl },
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    },
  );
}

async function runMigrateDeployExpectingFailure(
  schemaPath: string,
  scopedDatabaseUrl: string,
) {
  const startedAt = Date.now();
  try {
    await runMigrateDeploy(schemaPath, scopedDatabaseUrl);
  } catch (error) {
    const commandError = error as Error & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    return {
      elapsedMs: Date.now() - startedAt,
      output: `${String(commandError.stdout ?? "")}\n${String(commandError.stderr ?? "")}\n${commandError.message}`,
    };
  }
  throw new Error("Expected prisma migrate deploy to fail");
}

async function seedMigrationPaymentEvidence(
  client: PrismaClient,
  count: number,
) {
  const suffix = randomUUID().replaceAll("-", "");
  const userId = `migration-user-${suffix}`;
  const orderIdPrefix = `migration-order-${suffix}-`;
  const orderNoPrefix = `MIG-${suffix}-`;
  const paymentIdPrefix = `migration-payment-${suffix}-`;

  await client.$executeRawUnsafe(
    `INSERT INTO "users" ("id", "password_hash", "created_at", "updated_at") VALUES ($1, $2, NOW(), NOW())`,
    userId,
    "integration-test",
  );
  await client.$executeRawUnsafe(
    `
      INSERT INTO "orders" (
        "id", "order_no", "user_id", "amount", "order_status", "created_at", "updated_at"
      )
      SELECT $1 || value, $2 || value, $3, 9.90, 'cancelled', NOW(), NOW()
      FROM generate_series(1, $4::integer) AS series(value)
    `,
    orderIdPrefix,
    orderNoPrefix,
    userId,
    count,
  );
  await client.$executeRawUnsafe(
    `
      INSERT INTO "payment_transactions" (
        "id", "order_id", "payment_type", "amount", "created_at", "updated_at"
      )
      SELECT $1 || value, $2 || value, 'alipay', 9.90, NOW(), NOW()
      FROM generate_series(1, $3::integer) AS series(value)
    `,
    paymentIdPrefix,
    orderIdPrefix,
    count,
  );

  return {
    orderId: `${orderIdPrefix}1`,
    paymentId: `${paymentIdPrefix}1`,
  };
}

async function expectIntermediateMigrationProtection(input: {
  client: PrismaClient;
  schemaName: string;
  orderId: string;
  expectAllValidated: boolean;
}) {
  const constraints = await readProtectedConstraints(
    input.client,
    input.schemaName,
  );
  const constraintsByName = new Map(
    constraints.map((constraint) => [constraint.conname, constraint]),
  );

  for (const constraint of protectedForeignKeys) {
    expect(constraintsByName.has(constraint)).toBe(true);
    const temporary = constraintsByName.get(temporaryConstraintName(constraint));
    expect(temporary).toMatchObject({ confdeltype: "r" });
    if (input.expectAllValidated) {
      expect(temporary?.convalidated).toBe(true);
    } else {
      expect(temporary?.convalidated).toBe(false);
    }
  }

  const triggers = await readTemporaryGuardTriggers(
    input.client,
    input.schemaName,
  );
  expect(triggers.map((trigger) => trigger.tgname)).toEqual(
    [...temporaryGuardTriggers].sort(),
  );

  const functions = await readTemporaryGuardFunctions(
    input.client,
    input.schemaName,
  );
  expect(functions.map((guardFunction) => guardFunction.proname)).toEqual(
    [...temporaryGuardFunctions].sort(),
  );
  for (const guardFunction of functions) {
    expect(
      guardFunction.proconfig?.some((setting) =>
        setting.startsWith("search_path="),
      ),
    ).toBe(true);
  }

  await expectEvidenceDeleteBlocked(input.client, input.orderId);
}

async function expectFinalMigrationState(input: {
  client: PrismaClient;
  schemaName: string;
  orderId: string;
}) {
  const constraints = await readProtectedConstraints(
    input.client,
    input.schemaName,
  );
  const constraintsByName = new Map(
    constraints.map((constraint) => [constraint.conname, constraint]),
  );

  for (const constraint of protectedForeignKeys) {
    expect(constraintsByName.get(constraint)).toMatchObject({
      convalidated: true,
      confdeltype: "r",
    });
    expect(constraintsByName.has(temporaryConstraintName(constraint))).toBe(
      false,
    );
  }
  expect(
    await readTemporaryGuardTriggers(input.client, input.schemaName),
  ).toEqual([]);
  expect(
    await readTemporaryGuardFunctions(input.client, input.schemaName),
  ).toEqual([]);

  const columns = await input.client.$queryRawUnsafe<
    Array<{
      table_name: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >(
    `
      SELECT table_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1
        AND column_name = 'is_test_data'
        AND table_name = ANY($2::text[])
      ORDER BY table_name
    `,
    input.schemaName,
    ["orders", "users"],
  );
  expect(columns).toEqual([
    { table_name: "orders", is_nullable: "NO", column_default: "false" },
    { table_name: "users", is_nullable: "NO", column_default: "false" },
  ]);

  const expectedMigrationCount = (
    await readdir(migrationsRoot, { withFileTypes: true })
  ).filter((entry) => entry.isDirectory()).length;
  const [migrationCount] = await input.client.$queryRawUnsafe<
    Array<{ count: number }>
  >(
    `
      SELECT COUNT(*)::integer AS count
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `,
  );
  expect(migrationCount?.count).toBe(expectedMigrationCount);

  const appliedTask9Migrations = await input.client.$queryRawUnsafe<
    Array<{ migration_name: string }>
  >(
    `
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE migration_name = ANY($1::text[])
        AND finished_at IS NOT NULL
        AND rolled_back_at IS NULL
      ORDER BY migration_name
    `,
    [...task9MigrationNames],
  );
  expect(appliedTask9Migrations.map((migration) => migration.migration_name)).toEqual(
    [...task9MigrationNames],
  );

  await expectEvidenceDeleteBlocked(input.client, input.orderId);
}

async function readProtectedConstraints(
  client: PrismaClient,
  schemaName: string,
) {
  return client.$queryRawUnsafe<
    Array<{ conname: string; convalidated: boolean; confdeltype: string }>
  >(
    `
      SELECT constraint_row.conname, constraint_row.convalidated, constraint_row.confdeltype::text
      FROM pg_constraint AS constraint_row
      JOIN pg_namespace AS namespace_row
        ON namespace_row.oid = constraint_row.connamespace
      WHERE namespace_row.nspname = $1
        AND constraint_row.conname = ANY($2::text[])
      ORDER BY constraint_row.conname
    `,
    schemaName,
    [
      ...protectedForeignKeys,
      ...protectedForeignKeys.map(temporaryConstraintName),
    ],
  );
}

async function readTemporaryGuardTriggers(
  client: PrismaClient,
  schemaName: string,
) {
  return client.$queryRawUnsafe<Array<{ tgname: string }>>(
    `
      SELECT trigger_row.tgname
      FROM pg_trigger AS trigger_row
      JOIN pg_class AS table_row ON table_row.oid = trigger_row.tgrelid
      JOIN pg_namespace AS namespace_row ON namespace_row.oid = table_row.relnamespace
      WHERE namespace_row.nspname = $1
        AND trigger_row.tgname = ANY($2::text[])
      ORDER BY trigger_row.tgname
    `,
    schemaName,
    [...temporaryGuardTriggers],
  );
}

async function readTemporaryGuardFunctions(
  client: PrismaClient,
  schemaName: string,
) {
  return client.$queryRawUnsafe<
    Array<{ proname: string; proconfig: string[] | null }>
  >(
    `
      SELECT function_row.proname, function_row.proconfig
      FROM pg_proc AS function_row
      JOIN pg_namespace AS namespace_row
        ON namespace_row.oid = function_row.pronamespace
      WHERE namespace_row.nspname = $1
        AND function_row.proname = ANY($2::text[])
      ORDER BY function_row.proname
    `,
    schemaName,
    [...temporaryGuardFunctions],
  );
}

async function expectEvidenceDeleteBlocked(
  client: PrismaClient,
  orderId: string,
) {

  await expect(
    client.$executeRawUnsafe(
      'DELETE FROM "orders" WHERE "id" = $1',
      orderId,
    ),
  ).rejects.toBeDefined();
  const [orderCount] = await client.$queryRawUnsafe<Array<{ count: number }>>(
    'SELECT COUNT(*)::integer AS count FROM "orders" WHERE "id" = $1',
    orderId,
  );
  const [paymentCount] = await client.$queryRawUnsafe<Array<{ count: number }>>(
    'SELECT COUNT(*)::integer AS count FROM "payment_transactions" WHERE "order_id" = $1',
    orderId,
  );
  expect(orderCount?.count).toBe(1);
  expect(paymentCount?.count).toBe(1);
}

function databaseUrlForSchema(sourceDatabaseUrl: string, schemaName: string) {
  const url = new URL(sourceDatabaseUrl);
  url.searchParams.set("schema", schemaName);
  return url.toString();
}

function temporaryConstraintName(constraint: string) {
  return constraint.replace(/_fkey$/, "_restrict_fkey");
}

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
