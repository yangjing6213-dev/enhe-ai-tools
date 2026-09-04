-- CreateEnum
CREATE TYPE "ApiCreditTransactionType" AS ENUM ('plan_grant', 'recharge', 'referral_reward', 'api_charge', 'admin_adjustment', 'refund', 'correction');

-- CreateEnum
CREATE TYPE "ApiCreditBalanceBucket" AS ENUM ('plan', 'recharge', 'referral', 'mixed');

-- CreateTable
CREATE TABLE "api_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "developer_profile_id" TEXT NOT NULL,
    "plan_balance_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "recharge_balance_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "referral_balance_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "locked_balance_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_credit_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "developer_profile_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "usage_log_id" TEXT,
    "payment_id" TEXT,
    "referral_id" TEXT,
    "admin_audit_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "transaction_type" "ApiCreditTransactionType" NOT NULL,
    "amount_usd" DECIMAL(18,8) NOT NULL,
    "balance_bucket" "ApiCreditBalanceBucket" NOT NULL,
    "balance_after" JSONB NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_wallets_user_id_key" ON "api_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_wallets_developer_profile_id_key" ON "api_wallets"("developer_profile_id");

-- CreateIndex
CREATE INDEX "api_wallets_updated_at_idx" ON "api_wallets"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_credit_transactions_idempotency_key_key" ON "api_credit_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "api_credit_transactions_user_id_created_at_idx" ON "api_credit_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "api_credit_transactions_developer_profile_id_created_at_idx" ON "api_credit_transactions"("developer_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "api_credit_transactions_wallet_id_created_at_idx" ON "api_credit_transactions"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "api_credit_transactions_usage_log_id_idx" ON "api_credit_transactions"("usage_log_id");

-- CreateIndex
CREATE INDEX "api_credit_transactions_payment_id_idx" ON "api_credit_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "api_credit_transactions_transaction_type_created_at_idx" ON "api_credit_transactions"("transaction_type", "created_at");

-- AddForeignKey
ALTER TABLE "api_wallets" ADD CONSTRAINT "api_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_wallets" ADD CONSTRAINT "api_wallets_developer_profile_id_fkey" FOREIGN KEY ("developer_profile_id") REFERENCES "api_developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credit_transactions" ADD CONSTRAINT "api_credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credit_transactions" ADD CONSTRAINT "api_credit_transactions_developer_profile_id_fkey" FOREIGN KEY ("developer_profile_id") REFERENCES "api_developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credit_transactions" ADD CONSTRAINT "api_credit_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "api_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credit_transactions" ADD CONSTRAINT "api_credit_transactions_usage_log_id_fkey" FOREIGN KEY ("usage_log_id") REFERENCES "api_usage_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
