-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'zpay',
    "provider_trade_no" TEXT,
    "provider_order_id" TEXT,
    "payment_type" TEXT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "qr_code_url" TEXT,
    "qr_image_url" TEXT,
    "pay_url" TEXT,
    "pay_url2" TEXT,
    "raw_response" JSONB,
    "notify_payload" JSONB,
    "refund_payload" JSONB,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_order_id_key" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_trade_no_idx" ON "payment_transactions"("provider_trade_no");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
