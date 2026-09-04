-- CreateEnum
CREATE TYPE "ApiUsageBillingStatus" AS ENUM ('not_billable', 'pending', 'billed', 'review');

-- CreateTable
CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "developer_profile_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "key_prefix" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "model" TEXT,
    "public_model_name" TEXT,
    "upstream_provider" TEXT,
    "upstream_model" TEXT,
    "status_code" INTEGER NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "charged_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "is_stream" BOOLEAN NOT NULL DEFAULT false,
    "error_code" TEXT,
    "error_message" TEXT,
    "client_ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "billing_status" "ApiUsageBillingStatus" NOT NULL DEFAULT 'not_billable',
    "stream_finish_reason" TEXT,
    "upstream_request_id_hash" TEXT,
    "route_id" TEXT,
    "wallet_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_logs_request_id_key" ON "api_usage_logs"("request_id");

-- CreateIndex
CREATE INDEX "api_usage_logs_user_id_created_at_idx" ON "api_usage_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_developer_profile_id_created_at_idx" ON "api_usage_logs"("developer_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_api_key_id_created_at_idx" ON "api_usage_logs"("api_key_id", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_public_model_name_created_at_idx" ON "api_usage_logs"("public_model_name", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_model_created_at_idx" ON "api_usage_logs"("model", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_status_code_created_at_idx" ON "api_usage_logs"("status_code", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_error_code_created_at_idx" ON "api_usage_logs"("error_code", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_logs_path_created_at_idx" ON "api_usage_logs"("path", "created_at");

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_developer_profile_id_fkey" FOREIGN KEY ("developer_profile_id") REFERENCES "api_developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
