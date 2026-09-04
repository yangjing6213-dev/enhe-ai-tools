ALTER TABLE "order_refund_records"
ADD COLUMN "refund_proof_image" TEXT,
ADD COLUMN "completed_at" TIMESTAMP(3);

UPDATE "order_refund_records"
SET "completed_at" = "updated_at"
WHERE "status" = 'completed' AND "completed_at" IS NULL;
