-- Install columns and temporary evidence protection without scanning tables.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "users"
  ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders"
  ADD COLUMN "is_test_data" BOOLEAN NOT NULL DEFAULT false;

-- The old CASCADE/SET NULL triggers can run before a second FK trigger. Install
-- temporary BEFORE DELETE guards alongside the replacement NOT VALID FKs.

CREATE FUNCTION "task9_guard_order_evidence_delete_fn"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "payment_transactions" WHERE "order_id" = OLD."id"
  ) OR EXISTS (
    SELECT 1 FROM "order_refund_records" WHERE "order_id" = OLD."id"
  ) OR EXISTS (
    SELECT 1 FROM "seo_audit_runs" WHERE "source_order_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION 'order has protected financial or audit evidence'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

CREATE FUNCTION "task9_guard_user_report_delete_fn"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "seo_audit_runs" WHERE "user_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION 'user owns protected audit evidence'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

CREATE FUNCTION "task9_guard_tool_order_delete_fn"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "orders" WHERE "tool_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION 'tool has protected order evidence'
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER "task9_guard_order_evidence_delete"
  BEFORE DELETE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION "task9_guard_order_evidence_delete_fn"();

CREATE TRIGGER "task9_guard_user_report_delete"
  BEFORE DELETE ON "users"
  FOR EACH ROW EXECUTE FUNCTION "task9_guard_user_report_delete_fn"();

CREATE TRIGGER "task9_guard_tool_order_delete"
  BEFORE DELETE ON "tools"
  FOR EACH ROW EXECUTE FUNCTION "task9_guard_tool_order_delete_fn"();

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_order_id_restrict_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "order_refund_records"
  ADD CONSTRAINT "order_refund_records_order_id_restrict_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_source_order_id_restrict_fkey"
    FOREIGN KEY ("source_order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "seo_audit_runs"
  ADD CONSTRAINT "seo_audit_runs_user_id_restrict_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_tool_id_restrict_fkey"
    FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
COMMIT;
