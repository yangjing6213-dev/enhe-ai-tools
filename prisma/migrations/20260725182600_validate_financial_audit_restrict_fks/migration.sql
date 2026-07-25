-- Validate every temporary FK atomically while the old constraints and delete
-- guards remain in place.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10min';

ALTER TABLE "payment_transactions"
  VALIDATE CONSTRAINT "payment_transactions_order_id_restrict_fkey";

ALTER TABLE "order_refund_records"
  VALIDATE CONSTRAINT "order_refund_records_order_id_restrict_fkey";

ALTER TABLE "seo_audit_runs"
  VALIDATE CONSTRAINT "seo_audit_runs_source_order_id_restrict_fkey";

ALTER TABLE "seo_audit_runs"
  VALIDATE CONSTRAINT "seo_audit_runs_user_id_restrict_fkey";

ALTER TABLE "orders"
  VALIDATE CONSTRAINT "orders_tool_id_restrict_fkey";
COMMIT;
