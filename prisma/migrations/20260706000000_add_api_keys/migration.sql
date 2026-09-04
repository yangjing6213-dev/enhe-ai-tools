-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "developer_profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_hash_version" INTEGER NOT NULL DEFAULT 1,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'active',
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_status_created_at_idx" ON "api_keys"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "api_keys_developer_profile_id_status_created_at_idx" ON "api_keys"("developer_profile_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_developer_profile_id_fkey" FOREIGN KEY ("developer_profile_id") REFERENCES "api_developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
