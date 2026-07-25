BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE "users"
  ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders"
  ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "payment_transactions"
  DROP CONSTRAINT "payment_transactions_order_id_fkey";

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "order_refund_records"
  DROP CONSTRAINT "order_refund_records_order_id_fkey";

ALTER TABLE "order_refund_records"
  ADD CONSTRAINT "order_refund_records_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "seo_audit_runs"
  DROP CONSTRAINT "seo_audit_runs_source_order_id_fkey";

ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_source_order_id_fkey"
    FOREIGN KEY ("source_order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "seo_audit_runs"
  DROP CONSTRAINT "seo_audit_runs_user_id_fkey";

ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "orders"
  DROP CONSTRAINT "orders_tool_id_fkey";

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_tool_id_fkey"
    FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "payment_transactions"
  VALIDATE CONSTRAINT "payment_transactions_order_id_fkey";

ALTER TABLE "order_refund_records"
  VALIDATE CONSTRAINT "order_refund_records_order_id_fkey";

ALTER TABLE "seo_audit_runs"
  VALIDATE CONSTRAINT "seo_audit_runs_source_order_id_fkey";

ALTER TABLE "seo_audit_runs"
  VALIDATE CONSTRAINT "seo_audit_runs_user_id_fkey";

ALTER TABLE "orders"
  VALIDATE CONSTRAINT "orders_tool_id_fkey";

COMMIT;
