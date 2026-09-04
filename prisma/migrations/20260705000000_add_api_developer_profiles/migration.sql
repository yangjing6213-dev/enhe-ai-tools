-- CreateEnum
CREATE TYPE "ApiDeveloperProfileStatus" AS ENUM ('active', 'suspended', 'closed');

-- CreateTable
CREATE TABLE "api_developer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "developer_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "email_snapshot" TEXT,
    "status" "ApiDeveloperProfileStatus" NOT NULL DEFAULT 'active',
    "suspended_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_developer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_developer_profiles_user_id_key" ON "api_developer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_developer_profiles_developer_id_key" ON "api_developer_profiles"("developer_id");

-- CreateIndex
CREATE INDEX "api_developer_profiles_status_created_at_idx" ON "api_developer_profiles"("status", "created_at");

-- AddForeignKey
ALTER TABLE "api_developer_profiles" ADD CONSTRAINT "api_developer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
