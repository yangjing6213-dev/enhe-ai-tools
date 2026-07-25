-- Replace the old FK definitions only after every temporary FK is validated.
-- A lock failure rolls this entire short name swap back.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "payment_transactions"
  DROP CONSTRAINT "payment_transactions_order_id_fkey";
ALTER TABLE "payment_transactions"
  RENAME CONSTRAINT "payment_transactions_order_id_restrict_fkey"
  TO "payment_transactions_order_id_fkey";

ALTER TABLE "order_refund_records"
  DROP CONSTRAINT "order_refund_records_order_id_fkey";
ALTER TABLE "order_refund_records"
  RENAME CONSTRAINT "order_refund_records_order_id_restrict_fkey"
  TO "order_refund_records_order_id_fkey";

ALTER TABLE "seo_audit_runs"
  DROP CONSTRAINT "seo_audit_runs_source_order_id_fkey";
ALTER TABLE "seo_audit_runs"
  RENAME CONSTRAINT "seo_audit_runs_source_order_id_restrict_fkey"
  TO "seo_audit_runs_source_order_id_fkey";

ALTER TABLE "seo_audit_runs"
  DROP CONSTRAINT "seo_audit_runs_user_id_fkey";
ALTER TABLE "seo_audit_runs"
  RENAME CONSTRAINT "seo_audit_runs_user_id_restrict_fkey"
  TO "seo_audit_runs_user_id_fkey";

ALTER TABLE "orders"
  DROP CONSTRAINT "orders_tool_id_fkey";
ALTER TABLE "orders"
  RENAME CONSTRAINT "orders_tool_id_restrict_fkey"
  TO "orders_tool_id_fkey";

DROP TRIGGER "task9_guard_order_evidence_delete" ON "orders";
DROP TRIGGER "task9_guard_user_report_delete" ON "users";
DROP TRIGGER "task9_guard_tool_order_delete" ON "tools";
DROP FUNCTION "task9_guard_order_evidence_delete_fn"();
DROP FUNCTION "task9_guard_user_report_delete_fn"();
DROP FUNCTION "task9_guard_tool_order_delete_fn"();
COMMIT;
