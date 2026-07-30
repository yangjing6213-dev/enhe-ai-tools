BEGIN;

CREATE TYPE "PaymentRefundState" AS ENUM ('requested', 'dispatching', 'provider_succeeded', 'finalized', 'finalize_retry', 'provider_rejected', 'ambiguous');

ALTER TABLE "payment_transactions"
  ADD COLUMN "refund_state" "PaymentRefundState",
  ADD COLUMN "refund_record_id" TEXT,
  ADD COLUMN "refund_dispatch_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refund_requested_at" TIMESTAMP(3),
  ADD COLUMN "refund_dispatch_started_at" TIMESTAMP(3),
  ADD COLUMN "refund_provider_responded_at" TIMESTAMP(3),
  ADD COLUMN "refund_last_error_code" TEXT,
  ADD COLUMN "refund_last_error_detail" TEXT;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_refund_dispatch_count_check"
  CHECK ("refund_dispatch_count" BETWEEN 0 AND 1);

ALTER TABLE "seo_audit_subscription_orders"
  ADD COLUMN "scheduled_runs_granted" INTEGER,
  ADD COLUMN "manual_runs_granted" INTEGER,
  ADD COLUMN "refunded_at" TIMESTAMP(3);

UPDATE "seo_audit_subscription_orders" AS subscription_order
SET
  "scheduled_runs_granted" = offer."max_scheduled_runs",
  "manual_runs_granted" = offer."manual_runs"
FROM "orders" AS purchase_order
JOIN "seo_audit_offers" AS offer
  ON offer."id" = purchase_order."seo_audit_offer_id"
WHERE purchase_order."id" = subscription_order."order_id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "seo_audit_subscription_orders" AS subscription_order
    LEFT JOIN "orders" AS purchase_order
      ON purchase_order."id" = subscription_order."order_id"
    LEFT JOIN "seo_audit_offers" AS offer
      ON offer."id" = purchase_order."seo_audit_offer_id"
    WHERE purchase_order."id" IS NULL
      OR offer."id" IS NULL
      OR offer."order_type" IS DISTINCT FROM 'seo_audit_monitoring'::"OrderType"
      OR offer."max_scheduled_runs" IS NULL
      OR offer."manual_runs" IS NULL
      OR offer."max_scheduled_runs" < 1
      OR offer."manual_runs" < 0
      OR subscription_order."scheduled_runs_granted" IS NULL
      OR subscription_order."manual_runs_granted" IS NULL
      OR subscription_order."scheduled_runs_granted" < 1
      OR subscription_order."manual_runs_granted" < 0
  ) THEN
    RAISE EXCEPTION 'Cannot backfill monitoring quota snapshots: every subscription order must reference a monitoring offer with max_scheduled_runs >= 1 and manual_runs >= 0';
  END IF;
END
$$;

ALTER TABLE "seo_audit_subscription_orders"
  ALTER COLUMN "scheduled_runs_granted" SET NOT NULL,
  ALTER COLUMN "manual_runs_granted" SET NOT NULL;

WITH completed_refunds AS (
  SELECT
    "order_id",
    MAX("completed_at") AS "completed_at"
  FROM "order_refund_records"
  WHERE "status" = 'completed'
  GROUP BY "order_id"
)
UPDATE "payment_transactions" AS payment_transaction
SET "refunded_at" = COALESCE(completed_refund."completed_at", purchase_order."updated_at")
FROM "orders" AS purchase_order
LEFT JOIN completed_refunds AS completed_refund
  ON completed_refund."order_id" = purchase_order."id"
WHERE payment_transaction."order_id" = purchase_order."id"
  AND payment_transaction."refunded_at" IS NULL
  AND (
    payment_transaction."status" = 'refunded'
    OR purchase_order."order_status" = 'refunded'
    OR completed_refund."order_id" IS NOT NULL
  );

WITH completed_refunds AS (
  SELECT
    "order_id",
    MAX("completed_at") AS "completed_at"
  FROM "order_refund_records"
  WHERE "status" = 'completed'
  GROUP BY "order_id"
)
UPDATE "seo_audit_subscription_orders" AS subscription_order
SET "refunded_at" = COALESCE(completed_refund."completed_at", payment_transaction."refunded_at", purchase_order."updated_at")
FROM "orders" AS purchase_order
LEFT JOIN "payment_transactions" AS payment_transaction
  ON payment_transaction."order_id" = purchase_order."id"
LEFT JOIN completed_refunds AS completed_refund
  ON completed_refund."order_id" = purchase_order."id"
WHERE subscription_order."order_id" = purchase_order."id"
  AND subscription_order."refunded_at" IS NULL
  AND (
    purchase_order."order_status" = 'refunded'
    OR payment_transaction."status" = 'refunded'
    OR payment_transaction."refunded_at" IS NOT NULL
    OR completed_refund."order_id" IS NOT NULL
  );

CREATE UNIQUE INDEX "payment_transactions_refund_record_id_key"
  ON "payment_transactions"("refund_record_id");

CREATE INDEX "payment_transactions_refund_state_refund_dispatch_started_at_idx"
  ON "payment_transactions"("refund_state", "refund_dispatch_started_at");

CREATE UNIQUE INDEX "order_refund_records_one_pending_per_order_idx"
  ON "order_refund_records"("order_id")
  WHERE "status" = 'pending';

CREATE INDEX "seo_audit_runs_source_order_id_kind_created_at_idx"
  ON "seo_audit_runs"("source_order_id", "kind", "created_at");

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_refund_record_id_fkey"
  FOREIGN KEY ("refund_record_id") REFERENCES "order_refund_records"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
