CREATE TYPE "account_recovery_token_purpose" AS ENUM ('verify_recovery_email', 'reset_password');

ALTER TABLE "users"
ADD COLUMN "recovery_email" TEXT,
ADD COLUMN "recovery_email_verified_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_recovery_email_key" ON "users"("recovery_email");

CREATE TABLE "account_recovery_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" "account_recovery_token_purpose" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_recovery_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_recovery_tokens_token_hash_key" ON "account_recovery_tokens"("token_hash");
CREATE INDEX "account_recovery_tokens_user_id_purpose_expires_at_idx" ON "account_recovery_tokens"("user_id", "purpose", "expires_at");
CREATE INDEX "account_recovery_tokens_email_purpose_created_at_idx" ON "account_recovery_tokens"("email", "purpose", "created_at");

CREATE TABLE "account_recovery_attempts" (
    "id" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_recovery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_recovery_attempts_email_hash_created_at_idx" ON "account_recovery_attempts"("email_hash", "created_at");
CREATE INDEX "account_recovery_attempts_ip_hash_created_at_idx" ON "account_recovery_attempts"("ip_hash", "created_at");
CREATE INDEX "account_recovery_attempts_created_at_idx" ON "account_recovery_attempts"("created_at");

ALTER TABLE "account_recovery_tokens"
ADD CONSTRAINT "account_recovery_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
