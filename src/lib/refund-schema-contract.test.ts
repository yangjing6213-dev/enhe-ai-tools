import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = resolve(process.cwd(), "prisma", "schema.prisma");
const migrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260726000000_add_payment_refund_state_machine",
  "migration.sql",
);
const paymentTransactionsMigrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260611193000_add_payment_transactions",
  "migration.sql",
);
const refundProviderReferenceMigrationPath = resolve(
  process.cwd(),
  "prisma",
  "migrations",
  "20260726030000_add_refund_provider_reference",
  "migration.sql",
);
const schema = readFileSync(schemaPath, "utf8");

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function countStandaloneTransactionStatement(
  value: string,
  statement: "BEGIN" | "COMMIT",
) {
  const statementPattern = new RegExp(`^\\s*${statement}\\s*;\\s*$`, "i");
  return value.split(/\r?\n/).filter((line) => statementPattern.test(line)).length;
}

function extractPaymentTransactionRefundBackfill(value: string) {
  const cteMarker = "WITH completed_refunds AS (";
  const paymentUpdateMarker =
    'UPDATE "payment_transactions" AS payment_transaction';
  const subscriptionUpdateMarker =
    'UPDATE "seo_audit_subscription_orders" AS subscription_order';
  const paymentUpdateIndex = value.indexOf(paymentUpdateMarker);
  const cteIndex = value.lastIndexOf(cteMarker, paymentUpdateIndex);

  if (cteIndex < 0 || paymentUpdateIndex < 0) {
    throw new Error("expected completed refund CTE and payment transaction update");
  }

  const nextCteIndex = value.indexOf(
    cteMarker,
    paymentUpdateIndex + paymentUpdateMarker.length,
  );
  const subscriptionUpdateIndex = value.indexOf(
    subscriptionUpdateMarker,
    paymentUpdateIndex + paymentUpdateMarker.length,
  );
  const boundaries = [nextCteIndex, subscriptionUpdateIndex].filter(
    (index) => index >= 0,
  );

  if (boundaries.length === 0) {
    throw new Error("expected monitoring binding backfill after payment update");
  }

  return value.slice(cteIndex, Math.min(...boundaries));
}

function extractMonitoringRefundBindingUpdate(value: string) {
  const updateMarker =
    'UPDATE "seo_audit_subscription_orders" AS subscription_order';
  const firstUpdateIndex = value.indexOf(updateMarker);
  const secondUpdateIndex = value.indexOf(
    updateMarker,
    firstUpdateIndex + updateMarker.length,
  );

  if (firstUpdateIndex < 0 || secondUpdateIndex < 0) {
    throw new Error("expected two subscription order updates in refund migration");
  }

  const remainder = value.slice(secondUpdateIndex);
  const nextIndex = /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i.exec(remainder);

  if (nextIndex?.index === undefined) {
    throw new Error("expected an index statement after monitoring refund backfill");
  }

  return remainder.slice(0, nextIndex.index);
}

function expectInOrder(value: string, snippets: string[]) {
  let previousIndex = -1;

  for (const snippet of snippets) {
    const currentIndex = value.indexOf(snippet);
    expect(currentIndex, `expected migration to contain: ${snippet}`).toBeGreaterThan(
      previousIndex,
    );
    previousIndex = currentIndex;
  }
}

function getPrismaBlock(kind: "enum" | "model", name: string) {
  const match = schema.match(new RegExp(`^${kind} ${name} \\{([\\s\\S]*?)^\\}`, "m"));
  expect(match, `${kind} ${name} must exist`).not.toBeNull();
  return match![1]
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

describe("payment refund state machine schema contract", () => {
  it("keeps refund review status separate from the seven provider execution states", () => {
    expect(getPrismaBlock("enum", "RefundStatus")).toEqual([
      "pending",
      "completed",
      "rejected",
    ]);
    expect(getPrismaBlock("enum", "PaymentRefundState")).toEqual([
      "requested",
      "dispatching",
      "provider_succeeded",
      "finalized",
      "finalize_retry",
      "provider_rejected",
      "ambiguous",
    ]);
  });

  it("persists one refund execution claim and its audit-safe timestamps", () => {
    expect(getPrismaBlock("model", "PaymentTransaction")).toEqual(
      expect.arrayContaining([
        'refundState PaymentRefundState? @map("refund_state")',
        'refundRecordId String? @unique @map("refund_record_id")',
        'refundDispatchCount Int @default(0) @map("refund_dispatch_count")',
        'refundRequestedAt DateTime? @map("refund_requested_at")',
        'refundDispatchStartedAt DateTime? @map("refund_dispatch_started_at")',
        'refundProviderRespondedAt DateTime? @map("refund_provider_responded_at")',
        'refundProviderReference String? @map("refund_provider_reference")',
        'refundLastErrorCode String? @map("refund_last_error_code")',
        'refundLastErrorDetail String? @map("refund_last_error_detail")',
        "refundRecord OrderRefundRecord? @relation(fields: [refundRecordId], references: [id], onDelete: Restrict)",
        "@@unique([provider, refundProviderReference])",
        "@@index([refundState, refundDispatchStartedAt])",
      ]),
    );
    expect(getPrismaBlock("model", "OrderRefundRecord")).toEqual(
      expect.arrayContaining(["paymentTransaction PaymentTransaction?"]),
    );
  });

  it("snapshots monitoring quota by order and indexes run funding evidence", () => {
    expect(getPrismaBlock("model", "SeoAuditSubscriptionOrder")).toEqual(
      expect.arrayContaining([
        'scheduledRunsGranted Int @map("scheduled_runs_granted")',
        'manualRunsGranted Int @map("manual_runs_granted")',
        'refundedAt DateTime? @map("refunded_at")',
      ]),
    );
    expect(getPrismaBlock("model", "SeoAuditRun")).toEqual(
      expect.arrayContaining(["@@index([sourceOrderId, kind, createdAt])"]),
    );
  });

  it("requires one payment transaction per order before refund backfill", () => {
    expect(
      existsSync(paymentTransactionsMigrationPath),
      "payment transaction migration must exist",
    ).toBe(true);
    const prerequisiteMigration = normalizeWhitespace(
      readFileSync(paymentTransactionsMigrationPath, "utf8"),
    );

    expect(prerequisiteMigration).toContain(
      'CREATE UNIQUE INDEX "payment_transactions_order_id_key" ON "payment_transactions"("order_id")',
    );
  });

  it("uses exactly one outer transaction for the migration", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(countStandaloneTransactionStatement(migration, "BEGIN")).toBe(1);
    expect(countStandaloneTransactionStatement(migration, "COMMIT")).toBe(1);
    expect(migration.trim()).toMatch(/^BEGIN\s*;/i);
    expect(migration.trim()).toMatch(/COMMIT\s*;$/i);
  });

  it("adds database guards for a single full-refund dispatcher and pending request", () => {
    expect(existsSync(migrationPath), "refund state migration must exist").toBe(true);
    const migration = readFileSync(migrationPath, "utf8");
    const normalizedMigration = normalizeWhitespace(migration);

    expect(normalizedMigration).toContain(
      'CREATE TYPE "PaymentRefundState" AS ENUM (\'requested\', \'dispatching\', \'provider_succeeded\', \'finalized\', \'finalize_retry\', \'provider_rejected\', \'ambiguous\')',
    );
    expect(normalizedMigration).toContain(
      'CHECK ("refund_dispatch_count" BETWEEN 0 AND 1)',
    );
    expect(normalizedMigration).toContain(
      'CREATE UNIQUE INDEX "order_refund_records_one_pending_per_order_idx" ON "order_refund_records"("order_id") WHERE "status" = \'pending\'',
    );
    expect(normalizedMigration).toContain(
      'CREATE INDEX "payment_transactions_refund_state_refund_dispatch_started_at_idx" ON "payment_transactions"("refund_state", "refund_dispatch_started_at")',
    );
    expect(normalizedMigration).toContain(
      'CREATE INDEX "seo_audit_runs_source_order_id_kind_created_at_idx" ON "seo_audit_runs"("source_order_id", "kind", "created_at")',
    );
    expect(normalizedMigration).toContain(
      'CREATE UNIQUE INDEX "payment_transactions_refund_record_id_key" ON "payment_transactions"("refund_record_id")',
    );
    expect(normalizedMigration).toContain(
      'ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_refund_record_id_fkey" FOREIGN KEY ("refund_record_id") REFERENCES "order_refund_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
    );
    expectInOrder(normalizedMigration, [
      'ADD COLUMN "refund_record_id" TEXT',
      'CREATE UNIQUE INDEX "payment_transactions_refund_record_id_key"',
      'ADD CONSTRAINT "payment_transactions_refund_record_id_fkey"',
    ]);
  });

  it("prevents reuse of a provider refund reference across orders", () => {
    expect(
      existsSync(refundProviderReferenceMigrationPath),
      "refund provider reference migration must exist",
    ).toBe(true);
    const migration = normalizeWhitespace(
      readFileSync(refundProviderReferenceMigrationPath, "utf8"),
    );

    expectInOrder(migration, [
      'ADD COLUMN "refund_provider_reference" TEXT',
      'CREATE UNIQUE INDEX "payment_transactions_provider_refund_provider_reference_key" ON "payment_transactions"("provider", "refund_provider_reference")',
    ]);
  });

  it("backfills monitoring quota snapshots before enforcing non-null columns", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const normalizedMigration = normalizeWhitespace(migration);

    expect(normalizedMigration).not.toMatch(
      /ADD COLUMN "(?:scheduled|manual)_runs_granted" INTEGER NOT NULL DEFAULT 0/,
    );
    expect(normalizedMigration).toContain(
      'UPDATE "seo_audit_subscription_orders" AS subscription_order SET "scheduled_runs_granted" = offer."max_scheduled_runs", "manual_runs_granted" = offer."manual_runs" FROM "orders" AS purchase_order JOIN "seo_audit_offers" AS offer ON offer."id" = purchase_order."seo_audit_offer_id" WHERE purchase_order."id" = subscription_order."order_id"',
    );
    expect(normalizedMigration).toContain(
      'LEFT JOIN "orders" AS purchase_order ON purchase_order."id" = subscription_order."order_id" LEFT JOIN "seo_audit_offers" AS offer ON offer."id" = purchase_order."seo_audit_offer_id"',
    );
    expect(normalizedMigration).toContain(
      'offer."order_type" IS DISTINCT FROM \'seo_audit_monitoring\'::"OrderType"',
    );
    expect(normalizedMigration).toContain('offer."max_scheduled_runs" IS NULL');
    expect(normalizedMigration).toContain('offer."manual_runs" IS NULL');
    expect(normalizedMigration).toContain('offer."max_scheduled_runs" < 1');
    expect(normalizedMigration).toContain('offer."manual_runs" < 0');

    expectInOrder(normalizedMigration, [
      'ADD COLUMN "scheduled_runs_granted" INTEGER',
      'UPDATE "seo_audit_subscription_orders" AS subscription_order',
      "RAISE EXCEPTION 'Cannot backfill monitoring quota snapshots",
      'ALTER COLUMN "scheduled_runs_granted" SET NOT NULL',
      'ALTER COLUMN "manual_runs_granted" SET NOT NULL',
    ]);
  });

  it("preserves historical refund timestamps for transactions and monitoring orders", () => {
    const migration = readFileSync(migrationPath, "utf8");
    const paymentTransactionBackfill = normalizeWhitespace(
      extractPaymentTransactionRefundBackfill(migration),
    );
    const monitoringBindingUpdate = normalizeWhitespace(
      extractMonitoringRefundBindingUpdate(migration),
    );

    expect(paymentTransactionBackfill).toContain(
      'UPDATE "payment_transactions" AS payment_transaction SET "refunded_at" = COALESCE(completed_refund."completed_at", purchase_order."updated_at")',
    );
    expect(paymentTransactionBackfill).toContain(
      'payment_transaction."status" = \'refunded\'',
    );
    expect(paymentTransactionBackfill).toContain(
      'purchase_order."order_status" = \'refunded\'',
    );
    expect(paymentTransactionBackfill).toContain(
      'completed_refund."order_id" IS NOT NULL',
    );
    expect(paymentTransactionBackfill).toContain(
      'payment_transaction."refunded_at" IS NULL',
    );
    expect(paymentTransactionBackfill).toContain(
      'FROM "order_refund_records" WHERE "status" = \'completed\'',
    );

    expect(monitoringBindingUpdate).toContain(
      'UPDATE "seo_audit_subscription_orders" AS subscription_order SET "refunded_at" = COALESCE(completed_refund."completed_at", payment_transaction."refunded_at", purchase_order."updated_at")',
    );
    expect(monitoringBindingUpdate).toContain(
      'purchase_order."order_status" = \'refunded\'',
    );
    expect(monitoringBindingUpdate).toContain(
      'payment_transaction."status" = \'refunded\'',
    );
    expect(monitoringBindingUpdate).toContain(
      'payment_transaction."refunded_at" IS NOT NULL',
    );
    expect(monitoringBindingUpdate).toContain(
      'completed_refund."order_id" IS NOT NULL',
    );
  });
});
