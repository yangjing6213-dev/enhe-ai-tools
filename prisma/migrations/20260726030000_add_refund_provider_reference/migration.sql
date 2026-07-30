BEGIN;

ALTER TABLE "payment_transactions"
  ADD COLUMN "refund_provider_reference" TEXT;

CREATE UNIQUE INDEX "payment_transactions_provider_refund_provider_reference_key"
  ON "payment_transactions"("provider", "refund_provider_reference");

COMMIT;
