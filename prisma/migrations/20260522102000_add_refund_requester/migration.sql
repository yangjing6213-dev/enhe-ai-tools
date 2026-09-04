ALTER TABLE "order_refund_records" DROP CONSTRAINT IF EXISTS "order_refund_records_admin_id_fkey";

ALTER TABLE "order_refund_records" ALTER COLUMN "admin_id" DROP NOT NULL;

ALTER TABLE "order_refund_records" ADD COLUMN "requester_id" TEXT;

CREATE INDEX "order_refund_records_requester_id_created_at_idx" ON "order_refund_records"("requester_id", "created_at");

ALTER TABLE "order_refund_records"
  ADD CONSTRAINT "order_refund_records_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_refund_records"
  ADD CONSTRAINT "order_refund_records_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
